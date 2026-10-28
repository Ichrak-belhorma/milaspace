import { DRINKS, useRoomStore, type DrinkId, type RoomObjectId } from "./room";
import { isCloseup, useUiStore } from "./ui";

/**
 * What happens when a room object is activated. Shared by 3D clicks and the keyboard object bar,
 * so both paths behave identically. From afar you just use things; seated at the desk, desk
 * objects also get a close-up.
 */
export function activateObject(id: RoomObjectId): void {
  const room = useRoomStore.getState();
  const ui = useUiStore.getState();

  if (ui.sleeping && id !== "bed") ui.wake();
  // Using anything else stops peeking into the drawer.
  if (id !== "drawer" && ui.focus === "drawer") ui.setFocus(null);
  if (ui.pose === "seated" && isCloseup(id)) ui.setFocus(id);

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
    case "curtains":
      room.toggleCurtains();
      ui.announce(useRoomStore.getState().curtainsClosed ? "Curtains drawn" : "Curtains open");
      break;
    case "mug": {
      if (!room.drink.kind) {
        ui.setInspect("mug");
        break;
      }
      const result = room.sip();
      const left = useRoomStore.getState().drink.sipsLeft;
      ui.announce(result === "sipped" ? (left === 0 ? "Last sip" : "Sip") : "Cup cleared away");
      break;
    }
    case "drawer":
      if (room.drawerOpen) {
        closeDrawer();
      } else {
        room.toggleDrawer();
        if (ui.pose === "lying") ui.setPose("standing");
        ui.setFocus("drawer");
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
    case "desk":
      if (ui.pose !== "seated") {
        ui.setPose("seated");
        ui.announce("You sit down at your desk. Click things on it for a closer look.");
      } else if (ui.focus) {
        ui.setFocus(null);
      }
      break;
    case "bed":
      if (ui.pose !== "lying") {
        ui.setPose("lying");
        ui.setInspect("bed");
        ui.announce("You slip under the covers. Move the mouse to look around.");
      } else {
        ui.setInspect("bed");
      }
      break;
    case "phone":
      ui.setInspect("phone");
      break;
    case "painting":
      ui.setInspect("painting");
      break;
  }
}

export function chooseDrink(kind: DrinkId): void {
  useRoomStore.getState().makeDrink(kind);
  const ui = useUiStore.getState();
  ui.setInspect(null);
  ui.announce(DRINKS[kind].ready);
}

/** Close the drawer and stop peeking into it. */
export function closeDrawer(): void {
  const room = useRoomStore.getState();
  const ui = useUiStore.getState();
  if (room.drawerOpen) room.toggleDrawer();
  if (ui.focus === "drawer") ui.setFocus(null);
  if (ui.inspect === "drawer") ui.setInspect(null);
  ui.announce("Drawer closed");
}

/** Esc and clicks on empty space: undo the innermost thing, closing the drawer when its peek is next. */
export function dismissTop(): boolean {
  const ui = useUiStore.getState();
  const drawerIsNext = !ui.sleeping && (ui.inspect === "drawer" || (!ui.inspect && !ui.panel && ui.focus === "drawer"));
  if (drawerIsNext) {
    closeDrawer();
    return true;
  }
  return ui.dismiss();
}

/** A click in the room that hit nothing interactive: close quick controls or step back from a close-up. */
export function missedClick(): void {
  const ui = useUiStore.getState();
  if (ui.inspect === "drawer" || ui.focus === "drawer") closeDrawer();
  else if (ui.inspect) ui.setInspect(null);
  else if (ui.focus && isCloseup(ui.focus)) ui.setFocus(null);
}

export const OBJECT_LABELS: Record<RoomObjectId, string> = {
  window: "Window",
  curtains: "Curtains",
  painting: "Painting",
  lamp: "Desk lamp",
  laptop: "Laptop",
  notebook: "Notebook",
  mug: "Drink",
  fidget: "Fidget spinner",
  drawer: "Drawer",
  desk: "Desk chair",
  phone: "Phone",
  bed: "Bed",
};

/** The action a click will perform, for button labels. */
export function objectActionLabel(id: RoomObjectId): string {
  const room = useRoomStore.getState();
  const ui = useUiStore.getState();
  switch (id) {
    case "lamp":
      return room.lamp.on ? "Turn the lamp off" : "Turn the lamp on";
    case "window":
      return room.window.open ? "Close the window" : "Open the window";
    case "curtains":
      return room.curtainsClosed ? "Open the curtains" : "Draw the curtains";
    case "painting":
      return "Change the painting";
    case "mug":
      return !room.drink.kind ? "Make a drink" : room.drink.sipsLeft > 0 ? "Take a sip" : "Clear the empty cup";
    case "drawer":
      return room.drawerOpen ? "Close the drawer" : "Open the drawer";
    case "laptop":
      return "Open the laptop to study";
    case "notebook":
      return "Open today's notebook";
    case "fidget":
      return "Spin the fidget spinner";
    case "desk":
      return ui.pose === "seated" ? "Look at the whole desk" : "Sit at the desk";
    case "phone":
      return "Check your phone";
    case "bed":
      return ui.pose === "lying" ? "Bed options" : "Get into bed";
  }
}
