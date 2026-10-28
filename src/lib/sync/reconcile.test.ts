import { describe, expect, it } from "vitest";
import { changesSince, reconcile } from "./reconcile";

type Row = { id: string; v: number; label?: string };
const k = { key: (r: Row) => r.id, stamp: (r: Row) => r.v };

describe("reconcile", () => {
  it("first sync uploads everything local and adds everything remote", () => {
    const r = reconcile([{ id: "a", v: 1 }], [{ id: "b", v: 1 }], {}, k);
    expect(r.merged.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect(r.upload.map((x) => x.id)).toEqual(["a"]);
    expect(r.remove).toEqual([]);
    expect(r.known).toEqual({ a: 1, b: 1 });
  });

  it("newest wins, ties go to the server", () => {
    const local = [
      { id: "a", v: 5, label: "local" },
      { id: "b", v: 2, label: "local" },
      { id: "c", v: 3, label: "local" },
    ];
    const remote = [
      { id: "a", v: 4, label: "remote" },
      { id: "b", v: 9, label: "remote" },
      { id: "c", v: 3, label: "remote" },
    ];
    const r = reconcile(local, remote, { a: 4, b: 2, c: 3 }, k);
    expect(Object.fromEntries(r.merged.map((x) => [x.id, x.label]))).toEqual({ a: "local", b: "remote", c: "remote" });
    expect(r.upload.map((x) => x.id)).toEqual(["a"]);
  });

  it("tells deletions apart from creations using the known record", () => {
    const local = [{ id: "kept", v: 1 }, { id: "deletedRemotely", v: 1 }];
    const remote = [{ id: "kept", v: 1 }, { id: "deletedLocally", v: 1 }];
    const r = reconcile(local, remote, { kept: 1, deletedRemotely: 1, deletedLocally: 1 }, k);
    expect(r.merged.map((x) => x.id)).toEqual(["kept"]);
    expect(r.remove).toEqual(["deletedLocally"]);
    expect(r.upload).toEqual([]);
    expect(r.known).toEqual({ kept: 1 });
  });

  it("finds changes since the last sync", () => {
    const local = [{ id: "same", v: 1 }, { id: "edited", v: 3 }, { id: "new", v: 1 }];
    const c = changesSince(local, { same: 1, edited: 2, gone: 1 }, k);
    expect(c.upload.map((x) => x.id)).toEqual(["edited", "new"]);
    expect(c.remove).toEqual(["gone"]);
  });
});
