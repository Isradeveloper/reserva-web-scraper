import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync, unlinkSync } from "fs";
import puppeteer, { Page } from "puppeteer";
import { ImgToB64, sleep } from "src/common/helpers";
import { createFolder } from "src/common/helpers/create-folder";
import { sendMailOptions } from "src/mail/interfaces/send-mail-options.interface";
import { MailService } from "src/mail/mail.service";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class PuppeterService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly mailService: MailService,
  ) {}

  // async test() {
  //   // Launch the browser and open a new blank page
  //   const browser = await puppeteer.launch({ headless: false });
  //   const page = await browser.newPage();

  //   // Navigate the page to a URL
  //   await page.goto("https://developer.chrome.com/", {
  //     waitUntil: "networkidle0",
  //   });

  //   // Set screen size
  //   await page.setViewport({ width: 1080, height: 1024 });

  //   // Type into search box
  //   await page.type(".devsite-search-field", "automate beyond recorder");

  //   // Wait and click on first result
  //   const searchResultSelector = ".devsite-result-item-link";
  //   await page.waitForSelector(searchResultSelector);
  //   await page.click(searchResultSelector);

  //   // Locate the full title with a unique string
  //   const textSelector = await page.waitForSelector(
  //     "text/Customize and automate",
  //   );
  //   const fullTitle = await textSelector?.evaluate((el) => el.textContent);

  //   // Print the full title
  //   console.log('The title of this blog post is "%s".', fullTitle);

  //   await browser.close();

  //   return { status: "success puppeteer" };
  // }

  @Cron("*/20 * * * * *")
  async reservarUsuarios() {
    const logger = new Logger("PuppeterService");
    logger.log("Ejecutando cron job de reservas de casino...");

    const usuarios = await this.userRepository.find({
      select: { password: true, cedula: true, email: true, name: true },
    });

    logger.log(`Usuarios encontrados: ${usuarios.length}`);

    for (const user of usuarios) {
      logger.log(`Procesando reserva para ${user.name}...`);
      await this.reservaCasino(user);
    }
  }

  async reservaCasino(user: User) {
    const logger = new Logger("Reserva cada 2 minutos");

    const SERVICIOS =
      "#kt_aside_menu > ul > li:nth-child(2) > a > span.menu-text";

    const GESTION_HUMANA =
      "#kt_aside_menu > ul > li.menu-item.menu-item-submenu.menu-item-open > div > ul > li > a > span";

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.goto("https://digital.tecnoglass.net/", {
        waitUntil: "networkidle0",
      });

      await page.type("#id_username", user.email);
      await page.type("#id_password", user.password);
      await page.click(
        "#kt_body > div > div > div.login-container.order-2.order-lg-1.d-flex.flex-center.flex-row-fluid.px-7.pt-lg-0.pb-lg-0.pt-4.pb-6.bg-white > div > div > form > div.pb-lg-0.pb-5 > button",
      );

      console.log("Esperando 10 segundos");

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      await page.click("#kt_aside_mobile_toggle");

      await this.clickWithJS(page, SERVICIOS);

      await this.clickWithJS(page, GESTION_HUMANA);

      await this.clickCasinoElement(page);

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      const casinoElement = await page.$("#id_casino");

      if (!casinoElement) {
        await page.click("#cancel_btn");
        await page.waitForNavigation({ waitUntil: "domcontentloaded" });

        await browser.close();
        logger.debug(`[${user.name}] - ya ha realizado la reserva`);

        console.log(`[${user.name}] - ya ha realizado la reserva`);

        return;
      }

      await page.select("#id_casino", "1");

      await page.click("#reserve_btn");

      await page.waitForNavigation({ waitUntil: "domcontentloaded" });

      createFolder(`reservas/${user.cedula}`);
      await page.screenshot({ path: `reservas/${user.cedula}/screenshot.png` });

      logger.debug(`[${user.name}] - Reserva realizada`);
      console.log(`[${user.name}]  Reserva realizada`);

      await this.notificarReserva(user);

      await browser.close();
    } catch (error) {
      console.log(error.message);
      logger.error(error.message);
      throw new InternalServerErrorException("Ha ocurrido un error interno");
    } finally {
      await browser.close();
    }
  }

  async clickWithJS(page: Page, selectorToClick: string) {
    await page.waitForSelector(selectorToClick, { visible: true });
    await page.evaluate((selector) => {
      document.querySelector<HTMLAnchorElement>(selector)?.click();
    }, selectorToClick);
  }

  async clickCasinoElement(page: Page) {
    await page.evaluate(() => {
      const casinoElement = [
        ...document.querySelectorAll("span.menu-text"),
      ].filter((el) => el.textContent?.trim() === "Casino")[0];
      if (casinoElement instanceof HTMLElement) {
        casinoElement.click();
      }
    });
  }

  async notificarReserva(user: User) {
    const pathScreenshot = `reservas/${user.cedula}/screenshot.png`;

    const exists = existsSync(pathScreenshot);

    const hoy = new Date().toLocaleString("es-CO", {
      timeZone: "America/Bogota",
    });

    const htmlBody = `
    <h1>Reserva de casino</h1>
    <p>Estimado ${user.name},</p>
    <p>Aquí tienes la confirmación de tu reserva para ${hoy}.</p>
  `;

    const emailOptions: sendMailOptions = {
      to: user.emailNotification ?? user.email,
      subject: `Reserva de casino ${user.name} [ ${hoy} ]`,
      htmlBody,
      attachments: exists
        ? [
            {
              filename: "evidencia.png",
              path: pathScreenshot,
            },
          ]
        : [],
    };

    const enviado = await this.mailService.sendEmail(emailOptions);

    if (enviado) {
      try {
        unlinkSync(pathScreenshot);
      } catch (error) {
        console.error("Error al eliminar el archivo:", error);
      }
    }

    return enviado;
  }
}
