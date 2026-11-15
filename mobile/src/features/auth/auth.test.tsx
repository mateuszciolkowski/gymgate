import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { renderThemed } from "@/ui/testUtils";

jest.mock("react-native-keyboard-controller", () => jest.requireActual("react-native-keyboard-controller/jest"));


describe("LoginScreen", () => {
  it("shows field errors and does not submit invalid input", async () => {
    const onSubmit = jest.fn();
    await renderThemed(<LoginScreen onSubmit={onSubmit} onSwitchToRegister={jest.fn()} />);
    await fireEvent.press(screen.getByTestId("login-submit"));
    expect(screen.getAllByText("Wypełnij to pole")).toHaveLength(2);
    await fireEvent.changeText(screen.getByTestId("login-email"), "zly");
    await fireEvent.changeText(screen.getByTestId("login-password"), "123");
    await fireEvent.press(screen.getByTestId("login-submit"));
    expect(screen.getByText("Nieprawidłowy email")).toBeOnTheScreen();
    expect(screen.getByText("Hasło musi mieć minimum 6 znaków")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("submits trimmed credentials and shows the thrown message in the banner", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("Nieprawidłowy email lub hasło"));
    await renderThemed(<LoginScreen onSubmit={onSubmit} onSwitchToRegister={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId("login-email"), " jan@x.pl ");
    await fireEvent.changeText(screen.getByTestId("login-password"), "secret1");
    await fireEvent.press(screen.getByTestId("login-submit"));
    expect(onSubmit).toHaveBeenCalledWith("jan@x.pl", "secret1");
    expect(await screen.findByText("Nieprawidłowy email lub hasło")).toBeOnTheScreen();
  });
  it("locks the form and shows 'Logowanie...' while pending", async () => {
    await renderThemed(<LoginScreen onSubmit={() => new Promise(() => undefined)} onSwitchToRegister={jest.fn()} />);
    await fireEvent.changeText(screen.getByTestId("login-email"), "jan@x.pl");
    await fireEvent.changeText(screen.getByTestId("login-password"), "secret1");
    await fireEvent.press(screen.getByTestId("login-submit"));
    expect(await screen.findByText("Logowanie...")).toBeOnTheScreen();
    expect(screen.getByTestId("login-email").props.editable).toBe(false);
  });
  it("switches to registration", async () => {
    const onSwitch = jest.fn();
    await renderThemed(<LoginScreen onSubmit={jest.fn()} onSwitchToRegister={onSwitch} />);
    await fireEvent.press(screen.getByTestId("login-to-register"));
    expect(onSwitch).toHaveBeenCalled();
  });
});

describe("RegisterScreen", () => {
  const fill = async () => {
    await fireEvent.changeText(screen.getByTestId("register-firstName"), "Jan");
    await fireEvent.changeText(screen.getByTestId("register-lastName"), "Kowalski");
    await fireEvent.changeText(screen.getByTestId("register-email"), "jan@x.pl");
    await fireEvent.changeText(screen.getByTestId("register-password"), "secret1");
    await fireEvent.changeText(screen.getByTestId("register-confirmPassword"), "secret1");
  };
  it("shows the mismatch banner and does not submit", async () => {
    const onSubmit = jest.fn();
    await renderThemed(<RegisterScreen onSubmit={onSubmit} onSwitchToLogin={jest.fn()} />);
    await fill();
    await fireEvent.changeText(screen.getByTestId("register-confirmPassword"), "secret2");
    await fireEvent.press(screen.getByTestId("register-submit"));
    expect(screen.getByText("Hasła nie są identyczne")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("applies the server name rules locally", async () => {
    await renderThemed(<RegisterScreen onSubmit={jest.fn()} onSwitchToLogin={jest.fn()} />);
    await fill();
    await fireEvent.changeText(screen.getByTestId("register-firstName"), "J");
    await fireEvent.press(screen.getByTestId("register-submit"));
    expect(screen.getByText("Imię musi mieć minimum 2 znaki")).toBeOnTheScreen();
  });
  it("omits an empty phone", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderThemed(<RegisterScreen onSubmit={onSubmit} onSwitchToLogin={jest.fn()} />);
    await fill();
    await fireEvent.press(screen.getByTestId("register-submit"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({ email: "jan@x.pl", password: "secret1", firstName: "Jan", lastName: "Kowalski", phone: undefined });
  });
  it("shows the generic message for a non-Error rejection", async () => {
    await renderThemed(<RegisterScreen onSubmit={() => Promise.reject("x")} onSwitchToLogin={jest.fn()} />);
    await fill();
    await fireEvent.press(screen.getByTestId("register-submit"));
    expect(await screen.findByText("Błąd rejestracji")).toBeOnTheScreen();
  });
});
