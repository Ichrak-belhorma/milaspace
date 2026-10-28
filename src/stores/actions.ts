import { useRoomStore, type RoomObjectId } from "./room";
import { useUiStore } from "./ui";

/**
 * What happens when a room object is activated. Shared by 3D clicks and the keyboard object bar,
 * so both paths behave identically.
 */
export function activateObject(id: RoomObjectId): void {
  const room = useRoomStore.getState();
  const ui = useUiStore.getState();
  // Using anything else stops peeking into the drawer.
  if (id !== "drawer" && ui.view === "drawer") ui.setView("room");
  switch (id) {
    case "lamp":
      room.toggleLamp();
      ui.setInspect("lamp");
      ui.announce(useRoomStore.getState().lamp.on ? "Lamp on" : "Lamp off");
      break;
    case "window":
      room.toggleWindow();
      ui.setInspect("window");
      ui.announce(useRoomStore.getState().window.open ? "Window open" : "Window closed");
      break;
    case "mug": {
      const result = room.useMug();
      const left = useRoomStore.getState().coffee.sipsLeft;
      ui.announce(result === "brought" ? "Fresh coffee on your desk" : result === "sipped" ? (left === 0 ? "Last sip" : "Sip") : "Mug cleared away");
      break;
    }
    case "drawer":
      if (room.drawerOpen) {
        closeDrawer();
      } else {
        room.toggleDrawer();
        ui.setView("drawer");
        ui.setInspect("drawer");
        ui.announce("Drawer open: a notebook and flashcards inside");
      }
      break;
    case "laptop":
      ui.openLaptop();
      break;
    case "notebook":
      ui.openPanel("notebook");
      break;
    case "fidget":
      room.clickFidget();
      break;
  }
}

/** Close the drawer and lean back out to the room. */
export function closeDrawer(): void {
  const room = useRoomStore.getState();
  const ui = useUiStore.getState();
  if (room.drawerOpen) room.toggleDrawer();
  if (ui.view === "drawer") ui.setView("room");
  if (ui.inspect === "drawer") ui.setInspect(null);
  ui.announce("Drawer closed");
}

/** Esc and clicks on empty space: leave the drawer peek first, then the innermost open thing. */
export function dismissTop(): boolean {
  if (useUiStore.getState().view === "drawer") {
    closeDrawer();
    return true;
  }
  return useUiStore.getState().dismiss();
}

export const OBJECT_LABELS: Record<RoomObjectId, string> = {
  lamp: "Desk lamp",
  window: "Window",
  mug: "Coffee",
  drawer: "Drawer",
  laptop: "Laptop",
  notebook: "Notebook",
  fidget: "Fidget spinner",
};

/** The action a click will perform, for button labels. */
export function objectActionLabel(id: RoomObjectId): string {
  const room = useRoomStore.getState();
  switch (id) {
    case "lamp":
      return room.lamp.on ? "Turn the lamp off" : "Turn the lamp on";
    case "window":
      return room.window.open ? "Close the window" : "Open the window";
    case "mug":
      return !room.coffee.present ? "Bring a coffee" : room.coffee.sipsLeft > 0 ? "Take a sip" : "Clear the empty mug";
    case "drawer":
      return room.drawerOpen ? "Close the drawer" : "Open the drawer";
    case "laptop":
      return "Open the laptop to study";
    case "notebook":
      return "Open today's notebook";
    case "fidget":
      return "Spin the fidget spinner";
  }
}
