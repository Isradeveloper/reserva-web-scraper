import { Page } from "puppeteer";

export const clickWithJS = async (
  page: Page,
  selectorToClick: string,
  visible: boolean = true,
): Promise<boolean> => {
  try {
    // Esperamos a que el selector esté visible y sea interactuable
    await page.waitForSelector(selectorToClick, { visible: visible });

    // Intentamos hacer clic usando la evaluación del contexto del navegador
    const result = await page.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (element && element instanceof HTMLElement) {
        element.click();
        return true;
      }
      return false;
    }, selectorToClick);

    return result; // Devuelve true si se hizo clic, false si no
  } catch (error) {
    console.error(
      `Error al intentar hacer clic en el selector "${selectorToClick}":`,
      error,
    );
    return false; // Devuelve false en caso de error
  }
};
