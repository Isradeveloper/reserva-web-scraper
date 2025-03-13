import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync, readFileSync, unlinkSync } from "fs";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { clickWithJS, sleep } from "src/common/helpers";
import { createFolder } from "src/common/helpers/create-folder";
import { ResendService } from "src/resend/resend.service";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";
import { Page } from "puppeteer";

@Injectable()
export class CasinoReservationService {
  private logger = new Logger(CasinoReservationService.name);
  private readonly MAX_RETRIES = 5;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailService: ResendService,
  ) {}

  @Cron("0 6 * * *", {
    //* Todos los días a las 6 am
    name: "reserva automática de almuerzo",
    timeZone: "America/Bogota",
  })
  async reservarUsuarios() {
    this.logger.log("Ejecutando cron job de reservas de casino...");

    const users = await this.userRepository.find({
      select: {
        password: true,
        cedula: true,
        email: true,
        name: true,
        emailNotification: true,
      },
    });

    this.logger.log(`Usuarios encontrados: ${users.length}`);

    const usersWithErrors: { user: User; error: string | undefined }[] = [];

    for (const user of users) {
      this.logger.log(`Procesando reserva para ${user.name}...`);
      let reserva = await this.reservaCasino(user);

      let attempt = 0;
      while (!reserva.success && attempt < this.MAX_RETRIES) {
        attempt++;
        this.logger.log(`Reintentando (${attempt}) para ${user.name}...`);
        reserva = await this.reservaCasino(user);
      }

      if (!reserva.success) {
        usersWithErrors.push({ user, error: reserva.error });
      }
    }

    if (usersWithErrors.length > 0) {
      await this.enviarCorreoErrores(usersWithErrors);
    }
  }

  async reservaCasino(user: User) {
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

      await page.goto("https://digital.tecnoglass.net/", {
        waitUntil: "networkidle0",
      });

      await page.type("#id_username", user.email);
      await page.type("#id_password", user.password);
      await page.click(
        "#kt_body > div > div > div.login-container.order-2.order-lg-1.d-flex.flex-center.flex-row-fluid.px-7.pt-lg-0.pb-lg-0.pt-4.pb-6.bg-white > div > div > form > div.pb-lg-0.pb-5 > button",
      );

      // await page.waitForNavigation({ waitUntil: "networkidle0" });

      await sleep(10000);

      await page.waitForSelector("#kt_header_mobile");

      await page.click("#kt_aside_mobile_toggle");

      await clickWithJS(page, SERVICIOS, false);

      await clickWithJS(page, GESTION_HUMANA, false);

      await this.clickCasinoElement(page);

      await page.waitForNavigation({ waitUntil: "networkidle0" });

      await sleep(10000);

      const casinoElement = await page.$("#id_casino");

      if (!casinoElement) {
        // await page.click("#cancel_btn");
        // await page.waitForNavigation({ waitUntil: "networkidle0" });
        // await sleep(10000);

        await browser.close();
        this.logger.log(`[${user.name}] - ya ha realizado la reserva`);
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

      this.logger.log(`[${user.name}] - Reserva realizada`);

      await this.notificarReserva(user, casino, fecha);

      return {
        success: true,
        error: undefined,
      };
    } catch (error) {
      this.logger.error(error.message);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      await browser.close();
    }
  }

  async clickCasinoElement(page: Page) {
    await page.waitForSelector("span.menu-text");
    await page.evaluate(() => {
      const casinoElement = [
        ...document.querySelectorAll("span.menu-text"),
      ].find((el) => el.textContent?.trim() === "Casino");
      if (casinoElement instanceof HTMLElement) {
        casinoElement.click();
      }
    });
  }

  async notificarReserva(user: User, casino: string, fecha: string) {
    const pathScreenshot = `reservas/${user.cedula}/screenshot.png`;
    const exists = existsSync(pathScreenshot);
    const attachments = exists
      ? [
          {
            filename: "evidencia.png",
            content: readFileSync(pathScreenshot).toString("base64"),
            type: "image/png",
          },
        ]
      : [];

    const emailOptions = {
      to: user.emailNotification,
      subject: `Confirmación de reserva ${user.name} [${casino} - ${fecha}]`,
      htmlContent: `<h1>Reserva de almuerzo en ${casino}</h1><p>Estimado/a ${user.name},</p><p>Tu reserva para el día ${fecha} en ${casino} ha sido confirmada.</p>`,
      attachments,
    };

    try {
      const enviado = await this.mailService.sendMail(emailOptions);
      if (enviado && exists) unlinkSync(pathScreenshot);
      return enviado;
    } catch (error) {
      console.error("Error al enviar el correo o eliminar la captura:", error);
      return false;
    }
  }

  async enviarCorreoErrores(
    usersWithErrors: { user: User; error: string | undefined }[],
  ) {
    const htmlContent = `
      <h1>Errores en reservas de almuerzo</h1>
      <p>Se presentaron errores en las reservas de almuerzo para los siguientes usuarios:</p>
      <ul>${usersWithErrors.map(({ user, error }) => `<li>${user.name}: ${error}</li>`).join("")}</ul>`;

    await this.mailService.sendMail({
      to: "israel.trujillo@energiasolarsa.com",
      subject: "Errores en reservas de almuerzo",
      htmlContent,
    });

    this.logger.log(
      `Correo de error enviado sobre ${usersWithErrors.length} usuarios.`,
    );
  }
}
