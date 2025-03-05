import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { clickWithJS, ImgToB64, sleep } from "src/common/helpers";
import { createFolder } from "src/common/helpers/create-folder";
import {
  Attachment,
  SendMail,
} from "src/resend/interfaces/send-mail.interface";
import { ResendService } from "src/resend/resend.service";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm";

@Injectable()
export class CasinoReservationService {
  private isBrowserOpen = false;
  private logger = new Logger(CasinoReservationService.name);

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
    const MAX_RETRIES = 5;

    if (!this.isBrowserOpen) {
      this.logger.log("Ejecutando cron job de reservas de casino...");
    }

    const users = await this.userRepository.find({
      select: { password: true, cedula: true, email: true, name: true },
    });

    const usersWithoutSuccess: User[] = [...users];
    const usersWithErrors: { user: User; error: string | undefined }[] = [];

    if (!this.isBrowserOpen) {
      this.logger.log(`Usuarios encontrados: ${users.length}`);
    }

    while (usersWithoutSuccess.length > 0) {
      let user = usersWithoutSuccess.shift();

      if (user && !this.isBrowserOpen) {
        this.logger.log(`Procesando reserva para ${user.name}...`);
        let reserva = await this.reservaCasino(user);

        if (!reserva.success) {
          // Reintentos
          for (let i = 1; i <= MAX_RETRIES; i++) {
            this.logger.log(`Intento ${i + 1} para ${user.name}...`);
            reserva = await this.reservaCasino(user);

            if (reserva.success) {
              this.logger.log(
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
      const htmlContent = `
      <h1>Errores en reservas de almuerzo</h1>
      <p>Estimado administrador,</p>
      <p>Se presentaron errores al realizar las reservas de almuerzo para los siguientes usuarios:</p>
      <ul>
        ${usersWithErrors.map(({ user, error }) => `<li>${user.name}: ${error}</li>`).join("")}
      </ul>
        `;

      const emailOptions: SendMail = {
        to: "israel.trujillo@energiasolarsa.com",
        subject: "Errores en reservas de almuerzo",
        htmlContent,
      };

      await this.mailService.sendMail(emailOptions);
      this.logger.log(
        `Correo de error enviado a administrador sobre ${usersWithErrors.length} usuarios.`,
      );
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

      this.isBrowserOpen = true;

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
        this.isBrowserOpen = false;
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
      this.isBrowserOpen = false;
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

  async notificarReserva(
    user: User,
    casino: string,
    fecha: string,
  ): Promise<boolean> {
    let attachments: Attachment[] = [];

    const pathScreenshot = `reservas/${user.cedula}/screenshot.png`;

    const exists = existsSync(pathScreenshot);

    if (exists) {
      const content = readFileSync(pathScreenshot).toString("base64");

      attachments.push({
        filename: "evidencia.png",
        content,
        type: "image/png",
      });
    }

    const htmlContent = `
      <h1>Reserva de almuerzo en ${casino}</h1>
      <p>Estimado/a ${user.name},</p>
      <p>Nos complace confirmar tu reserva para el día ${fecha} en ${casino}.</p>
    `;
    const emailOptions: SendMail = {
      to: user.emailNotification,
      subject: `Confirmación de reserva ${user.name} [${casino} - ${fecha}]`,
      htmlContent,
      attachments,
    };

    try {
      const enviado = await this.mailService.sendMail(emailOptions);

      if (enviado && exists) {
        // Eliminamos el archivo si fue enviado y existe
        unlinkSync(pathScreenshot);
      }

      return enviado;
    } catch (error) {
      console.error("Error al enviar el correo o eliminar la captura:", error);
      return false;
    }
  }
}
