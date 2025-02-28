import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { error } from "console";
import { existsSync, unlinkSync } from "fs";
import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
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

  private isBrowserOpen = false;

  async test() {
    puppeteer.use(StealthPlugin());
    // Launch the browser and open a new blank page
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      executablePath: "/usr/bin/chromium-browser",
    });
    const page = await browser.newPage();

    // Navigate the page to a URL
    await page.goto("https://developer.chrome.com/", {
      waitUntil: "networkidle0",
    });

    // Set screen size
    await page.setViewport({ width: 1080, height: 1024 });

    // Type into search box
    await page.type(".devsite-search-field", "automate beyond recorder");

    // Wait and click on first result
    const searchResultSelector = ".devsite-result-item-link";
    await page.waitForSelector(searchResultSelector);
    await page.click(searchResultSelector);

    // Locate the full title with a unique string
    const textSelector = await page.waitForSelector(
      "text/Customize and automate",
    );
    const fullTitle = await textSelector?.evaluate((el) => el.textContent);

    // Print the full title
    console.log('The title of this blog post is "%s".', fullTitle);

    await browser.close();

    return { status: "success puppeteer" };
  }

  @Cron("*/20 * * * * *", {
    name: "reserva automática de almuerzo",
    timeZone: "America/Bogota",
  })
  async reservarUsuarios() {
    const logger = new Logger("PuppeterService");
    const MAX_RETRIES = 5;

    if (!this.isBrowserOpen) {
      logger.log("Ejecutando cron job de reservas de casino...");
    }

    const users = await this.userRepository.find({
      select: { password: true, cedula: true, email: true, name: true },
    });

    const usersWithoutSuccess: User[] = [...users];
    const usersWithErrors: { user: User; error: string | undefined }[] = [];

    if (!this.isBrowserOpen) {
      logger.log(`Usuarios encontrados: ${users.length}`);
    }

    while (usersWithoutSuccess.length > 0) {
      let user = usersWithoutSuccess.shift();

      if (user && !this.isBrowserOpen) {
        logger.log(`Procesando reserva para ${user.name}...`);
        let reserva = await this.reservaCasino(user);

        if (!reserva.success) {
          // Reintentos
          for (let i = 1; i <= MAX_RETRIES; i++) {
            logger.log(`Intento ${i + 1} para ${user.name}...`);
            reserva = await this.reservaCasino(user);

            if (reserva.success) {
              logger.log(
                `Reserva exitosa para ${user.name} en el intento ${i + 1}.`,
              );
              break;
            }
          }

          // Si no se pudo reservar después de los intentos
          if (!reserva.success) {
            usersWithErrors.push({ user, error: reserva.error });
            user = undefined;
          }
        }
      }
    }

    if (usersWithErrors.length > 0) {
      // Generación del correo HTML
      const htmlBody = `
      <h1>Errores en reservas de almuerzo</h1>
      <p>Estimado administrador,</p>
      <p>Se presentaron errores al realizar las reservas de almuerzo para los siguientes usuarios:</p>
      <ul>
        ${usersWithErrors.map(({ user, error }) => `<li>${user.name}: ${error}</li>`).join("")}
      </ul>
        `;

      const emailOptions: sendMailOptions = {
        to: "israel.trujillo@energiasolarsa.com",
        subject: "Errores en reservas de almuerzo",
        htmlBody,
      };

      await this.mailService.sendEmail(emailOptions);
      logger.log(
        `Correo de error enviado a administrador sobre ${usersWithErrors.length} usuarios.`,
      );
    }
  }

  async reservaCasino(user: User) {
    const logger = new Logger("Reserva de casino");

    const SERVICIOS =
      "#kt_aside_menu > ul > li:nth-child(2) > a > span.menu-text";

    const GESTION_HUMANA =
      "#kt_aside_menu > ul > li.menu-item.menu-item-submenu.menu-item-open > div > ul > li > a > span";

    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    });
    try {
      const page = await browser.newPage();

      page.setDefaultNavigationTimeout(300000);

      this.isBrowserOpen = true;

      await page.goto("https://digital.tecnoglass.net/", {
        waitUntil: "networkidle0",
      });

      await page.type("#id_username", user.email);
      await page.type("#id_password", user.password);
      await page.click(
        "#kt_body > div > div > div.login-container.order-2.order-lg-1.d-flex.flex-center.flex-row-fluid.px-7.pt-lg-0.pb-lg-0.pt-4.pb-6.bg-white > div > div > form > div.pb-lg-0.pb-5 > button",
      );

      await page.waitForSelector("#kt_header_mobile");

      await page.click("#kt_aside_mobile_toggle");

      await this.clickWithJS(page, SERVICIOS);

      await this.clickWithJS(page, GESTION_HUMANA);

      await this.clickCasinoElement(page);

      await page.waitForNavigation({ waitUntil: "networkidle0" });

      const casinoElement = await page.$("#id_casino");

      if (!casinoElement) {
        // await page.click("#cancel_btn");
        // await page.waitForNavigation({ waitUntil: "networkidle0" });

        await browser.close();
        this.isBrowserOpen = false;
        logger.log(`[${user.name}] - ya ha realizado la reserva`);
        return {
          success: true,
          error: undefined,
        };
      }

      await page.select("#id_casino", "1");

      await page.click("#reserve_btn");

      await sleep(2000);

      createFolder(`reservas/${user.cedula}`);
      await page.screenshot({ path: `reservas/${user.cedula}/screenshot.png` });

      const casino =
        (await page.$eval("td.text-center.font-size-h6:nth-child(1)", (el) =>
          el.textContent?.trim(),
        )) || "";

      const fecha =
        (await page.$eval("td.text-center.font-size-h6:nth-child(2)", (el) =>
          el.textContent?.trim(),
        )) || "";

      logger.log(`[${user.name}] - Reserva realizada`);

      await this.notificarReserva(user, casino, fecha);

      return {
        success: true,
        error: undefined,
      };
    } catch (error) {
      logger.error(error.message);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      await browser.close();
      this.isBrowserOpen = false;
    }
  }

  async clickWithJS(page: Page, selectorToClick: string) {
    try {
      // Esperamos que el selector esté visible en la página
      await page.waitForSelector(selectorToClick);

      // Realizamos el clic mediante evaluación en el contexto del navegador
      const result = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (element) {
          (element as HTMLElement).click();
          return true;
        }
        return false;
      }, selectorToClick);

      if (!result) {
        return false;
      }
    } catch (error) {
      return false;
    }
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

  async notificarReserva(user: User, casino: string, fecha: string) {
    const pathScreenshot = `reservas/${user.cedula}/screenshot.png`;

    const exists = existsSync(pathScreenshot);

    const htmlBody = `
    <h1>Reserva de almuezo en ${casino}</h1>
    <p>Estimado ${user.name},</p>
    <p>Aquí tienes la confirmación de tu reserva para el día ${fecha}.</p>
  `;

    const emailOptions: sendMailOptions = {
      to: user.emailNotification ?? user.email,
      subject: `Reserva de casino ${user.name} [${casino} - ${fecha}]`,
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
