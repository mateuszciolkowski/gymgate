import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Alert, Text } from "react-native";
import { HttpError, NetworkError, ReauthRequiredError } from "@/api/errors";
import { PendingChangesError } from "@/session";
import { useTheme } from "@/theme";
import { renderThemed } from "@/ui/testUtils";
import { DELETE_FAILED, DELETE_OFFLINE, DELETE_REAUTH, REFRESH_FAILED, REFRESH_OK, deleteAccountError, refreshCache, refreshConfirmText } from "./settingsActions";
import { SettingsScreen } from "./SettingsScreen";
import { THEME_OPTIONS } from "./themeOptions";

const mockSession = {
  state: { status: "active", user: { id: "u1", firstName: "Jan", lastName: "Kowalski", email: "jan@x.pl" } },
  logout: jest.fn(),
  session: { deleteAccount: jest.fn() },
};
const mockSync = { engine: null as unknown, state: { pending: 0 } };
jest.mock("@/providers", () => ({ useSession: () => mockSession, useSync: () => mockSync }));

const engine = (status: string, lastError: string | null = null) => ({ resync: jest.fn().mockResolvedValue(undefined), getState: () => ({ status, lastError }) });

describe("refreshCache", () => {
  it("reports success only when the cycle ended idle without error", async () => {
    const ok = engine("idle");
    expect(await refreshCache(ok as never)).toBe(REFRESH_OK);
    expect(ok.resync).toHaveBeenCalled();
  });
  it("reports failure offline, on errors and without an engine (nothing is wiped by the failed attempt)", async () => {
    expect(await refreshCache(engine("offline", "x") as never)).toBe(REFRESH_FAILED);
    expect(await refreshCache(engine("paused", "Re-login required") as never)).toBe(REFRESH_FAILED);
    expect(await refreshCache(null)).toBe(REFRESH_FAILED);
  });
  it("tells about unsent changes in the confirmation", async () => {
    expect(refreshConfirmText(0)).not.toMatch(/Niewysłane/);
    expect(refreshConfirmText(3)).toMatch(/Niewysłane zmiany \(3\) zostaną najpierw wysłane/);
  });
});

describe("deleteAccountError", () => {
  it("maps offline, wrong password, expired session and the rest", async () => {
    expect(deleteAccountError(new NetworkError("x"))).toBe(DELETE_OFFLINE);
    expect(deleteAccountError(new HttpError(403, "Nieprawidłowe hasło", {}))).toBe("Nieprawidłowe hasło");
    expect(deleteAccountError(new HttpError(403, "HTTP 403", {}))).toBe("Nieprawidłowe hasło");
    expect(deleteAccountError(new ReauthRequiredError())).toBe(DELETE_REAUTH);
    expect(deleteAccountError(new HttpError(500, "HTTP 500", {}))).toBe(DELETE_FAILED);
  });
});

function ThemeProbe() {
  const { themeName } = useTheme();
  return <Text>{themeName}</Text>;
}

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSync.engine = null;
    mockSync.state = { pending: 0 };
  });

  it("shows header, profile card, rows and version footer", async () => {
    await renderThemed(<SettingsScreen />);
    expect(screen.getByText("Ustawienia")).toBeOnTheScreen();
    expect(screen.getByText("Profil i opcje")).toBeOnTheScreen();
    expect(screen.getByText("JK")).toBeOnTheScreen();
    expect(screen.getByText("Jan Kowalski")).toBeOnTheScreen();
    expect(screen.getByText("jan@x.pl")).toBeOnTheScreen();
    expect(screen.getByText("Aktualny: Ciemny")).toBeOnTheScreen();
    expect(screen.getByText("Wyloguj się")).toBeOnTheScreen();
    expect(screen.getByText(/^GymGate v\d+\.\d+\.\d+ · Offline-First Training App$/)).toBeOnTheScreen();
  });

  it("lists 6 dark and 6 light themes in the tabs and marks the active one", async () => {
    await renderThemed(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId("settings-theme"));
    expect(screen.getByText("Wybierz motyw kolorystyczny")).toBeOnTheScreen();
    expect(THEME_OPTIONS).toHaveLength(12);
    for (const t of THEME_OPTIONS.filter((o) => o.isDark)) expect(screen.getByTestId(`theme-option-${t.id}`)).toBeOnTheScreen();
    expect(screen.queryByTestId("theme-option-light")).toBeNull();
    expect(screen.getAllByTestId("theme-active")).toHaveLength(1);
    await fireEvent.press(screen.getByTestId("theme-tab-light"));
    for (const t of THEME_OPTIONS.filter((o) => !o.isDark)) expect(screen.getByTestId(`theme-option-${t.id}`)).toBeOnTheScreen();
    expect(screen.queryByTestId("theme-option-dark")).toBeNull();
    expect(screen.queryByTestId("theme-active")).toBeNull();
  });

  it("applies the picked theme at once and closes the sheet", async () => {
    await renderThemed(
      <>
        <ThemeProbe />
        <SettingsScreen />
      </>,
    );
    await fireEvent.press(screen.getByTestId("settings-theme"));
    await fireEvent.press(screen.getByTestId("theme-tab-light"));
    await fireEvent.press(screen.getByTestId("theme-option-sand"));
    expect(screen.getByText("sand")).toBeOnTheScreen();
    expect(screen.getByText("Aktualny: Piaskowy")).toBeOnTheScreen();
    expect(screen.queryByTestId("theme-sheet")).toBeNull();
  });

  it("asks before refreshing the cache and reports the result", async () => {
    const e = engine("idle");
    mockSync.engine = e;
    mockSync.state = { pending: 2 };
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_t, msg, buttons) => {
      if (buttons && buttons.length > 1) buttons[1]?.onPress?.();
    });
    await renderThemed(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId("settings-refresh"));
    await waitFor(() => expect(alert).toHaveBeenCalledWith("", REFRESH_OK));
    expect(alert.mock.calls[0]?.[1]).toMatch(/Niewysłane zmiany \(2\)/);
    expect(e.resync).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the refresh confirmation is cancelled", async () => {
    const e = engine("idle");
    mockSync.engine = e;
    jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => buttons?.[0]?.onPress?.());
    await renderThemed(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId("settings-refresh"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(e.resync).not.toHaveBeenCalled();
  });

  it("logs out through the pending-changes prompt", async () => {
    mockSession.logout.mockRejectedValueOnce(new PendingChangesError(2)).mockResolvedValueOnce(undefined);
    jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    await renderThemed(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId("settings-logout"));
    await waitFor(() => expect(mockSession.logout).toHaveBeenLastCalledWith({ pendingChanges: "keep" }));
  });

  it("deletes the account with the password; wrong password keeps the dialog open", async () => {
    mockSession.session.deleteAccount.mockRejectedValueOnce(new HttpError(403, "Nieprawidłowe hasło", {})).mockResolvedValueOnce(undefined);
    await renderThemed(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId("settings-delete"));
    await fireEvent.changeText(screen.getByTestId("delete-password"), "zle");
    await fireEvent.press(screen.getByTestId("delete-confirm"));
    expect(await screen.findByText("Nieprawidłowe hasło")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId("delete-password"), "Test1234!");
    await fireEvent.press(screen.getByTestId("delete-confirm"));
    await waitFor(() => expect(screen.queryByTestId("delete-password")).toBeNull());
    expect(mockSession.session.deleteAccount).toHaveBeenLastCalledWith("Test1234!");
  });

  it("shows a clear message when deleting offline", async () => {
    mockSession.session.deleteAccount.mockRejectedValueOnce(new NetworkError("x"));
    await renderThemed(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId("settings-delete"));
    await fireEvent.changeText(screen.getByTestId("delete-password"), "abc");
    await fireEvent.press(screen.getByTestId("delete-confirm"));
    expect(await screen.findByText(DELETE_OFFLINE)).toBeOnTheScreen();
  });
});
