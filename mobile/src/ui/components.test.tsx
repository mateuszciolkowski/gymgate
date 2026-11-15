import { fireEvent, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { Button } from "./Button";
import { FormField } from "./FormField";
import { Switch, mixHex, withAlpha } from "./Switch";
import { confirmAlert, showAlert } from "./alerts";
import { renderThemed } from "./testUtils";


describe("Button", () => {
  it("calls onPress", async () => {
    const onPress = jest.fn();
    await renderThemed(<Button onPress={onPress}>Zapisz</Button>);
    await fireEvent.press(screen.getByRole("button", { name: "Zapisz" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it("is inert while loading and shows loadingText", async () => {
    const onPress = jest.fn();
    await renderThemed(
      <Button loading loadingText="Zapisywanie..." onPress={onPress}>
        Zapisz
      </Button>,
    );
    expect(screen.getByText("Zapisywanie...")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
  it("is inert when disabled", async () => {
    const onPress = jest.fn();
    await renderThemed(
      <Button disabled variant="danger" onPress={onPress}>
        Usuń
      </Button>,
    );
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("FormField", () => {
  it("shows hint, the optional marker, and replaces the hint with the error", async () => {
    const first = await renderThemed(
      <FormField label="Telefon" optional hint="Podpowiedź">
        <></>
      </FormField>,
    );
    expect(screen.getByText("(opcjonalnie)")).toBeOnTheScreen();
    expect(screen.getByText("Podpowiedź")).toBeOnTheScreen();
    await first.unmount();
    await renderThemed(
      <FormField label="Telefon" hint="Podpowiedź" error="Błąd">
        <></>
      </FormField>,
    );
    expect(screen.queryByText("Podpowiedź")).toBeNull();
    expect(screen.getByText("Błąd")).toBeOnTheScreen();
  });
});

describe("Switch", () => {
  it("toggles through onChange", async () => {
    const onChange = jest.fn();
    await renderThemed(<Switch checked={false} onChange={onChange} label="Publiczny" />);
    await fireEvent.press(screen.getByLabelText("Publiczny"));
    expect(onChange).toHaveBeenCalledWith(true);
  });
  it("does not fire when disabled", async () => {
    const onChange = jest.fn();
    await renderThemed(<Switch checked disabled onChange={onChange} label="Publiczny" />);
    await fireEvent.press(screen.getByLabelText("Publiczny"));
    expect(onChange).not.toHaveBeenCalled();
  });
  it("resolves color-mix equivalents", () => {
    expect(withAlpha("#10B981", 0.15)).toBe("rgba(16, 185, 129, 0.15)");
    expect(mixHex("#ff0000", 0.5, "#000000")).toBe("rgb(128, 0, 0)");
  });
});

describe("alerts", () => {
  afterEach(() => jest.restoreAllMocks());
  it("showAlert uses the native alert with the message", () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    showAlert("Błąd tworzenia treningu");
    expect(spy).toHaveBeenCalledWith("", "Błąd tworzenia treningu");
  });
  it("confirmAlert resolves with the pressed button", async () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    await expect(confirmAlert("Na pewno?")).resolves.toBe(true);
    spy.mockImplementation((_t, _m, buttons) => {
      buttons?.[0]?.onPress?.();
    });
    await expect(confirmAlert("Na pewno?")).resolves.toBe(false);
  });
});
