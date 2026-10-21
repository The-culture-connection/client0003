import {test, expect} from "@playwright/test";
import {button, openApp} from "./support.js";

test("suite page and app both load", async ({page}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", {name: "MORTARVERSE TEST SUITE"})).toBeVisible();
  await expect(page.locator("#cases .case").first()).toBeVisible();

  await openApp(page);
  await expect(button(page, "SIGN UP")).toBeVisible();
});
