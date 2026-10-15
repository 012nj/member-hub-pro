import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { MORNING_STORAGE_KEY, nairobiDay } from "@/lib/appearance";

describe("AppearanceProvider", () => {
  afterEach(() => {
    localStorage.removeItem(MORNING_STORAGE_KEY);
    vi.restoreAllMocks();
  });

  it("keeps the selected background visible without login animations", () => {
    localStorage.setItem(MORNING_STORAGE_KEY, nairobiDay());
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    const { container } = render(
      <AppearanceProvider animateBackground={false} showMorningGreeting={false}>
        <main className="auth-page">Sign in</main>
      </AppearanceProvider>,
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(container.querySelector(".floral-backdrop img")).toBeInTheDocument();
    expect(container.querySelector(".morning-screen")).toBeNull();
  });

  it("does not block login with the morning overlay on a fresh browser visit", () => {
    localStorage.removeItem(MORNING_STORAGE_KEY);

    const { container } = render(
      <AppearanceProvider animateBackground={false} showMorningGreeting={false}>
        <main className="auth-page">Sign in</main>
      </AppearanceProvider>,
    );

    expect(container.querySelector(".morning-screen")).toBeNull();
    expect(container.querySelector(".app-experience")).not.toHaveAttribute("inert");
    expect(container.querySelector(".floral-backdrop img")).toBeInTheDocument();
  });
});
