// deleteAccountData runs against a fake transaction that records every call, so no database is used.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deleteAccountData, ownedFiles, type AccountTx } from "../src/lib/deleteAccount";

const bucket = "https://x.supabase.co/storage/v1/object/public/post-images";
const mine = (name: string) => `${bucket}/posts/u1/${name}`;

function fakeTx(data: { posts?: string[][]; checkIns?: string[][]; scans?: string[]; comments?: string[] } = {}) {
  const log: string[] = [];
  const calls: Record<string, any[]> = {};
  const op = (table: string, name: string, result: unknown = { count: 0 }) => async (args: unknown) => {
    log.push(`${table}.${name}`);
    (calls[`${table}.${name}`] ??= []).push(args);
    return result;
  };
  const del = (table: string) => ({ deleteMany: op(table, "deleteMany") });

  const tx: AccountTx = {
    comment: {
      findMany: op("comment", "findMany", (data.comments ?? []).map((id) => ({ id }))),
      updateMany: op("comment", "updateMany"),
      deleteMany: op("comment", "deleteMany"),
    },
    postLike: del("postLike"),
    bookmark: del("bookmark"),
    report: del("report"),
    post: { findMany: op("post", "findMany", (data.posts ?? []).map((images) => ({ images }))), deleteMany: op("post", "deleteMany") },
    routineStep: del("routineStep"),
    routine: del("routine"),
    review: del("review"),
    checkIn: { findMany: op("checkIn", "findMany", (data.checkIns ?? []).map((images) => ({ images }))), deleteMany: op("checkIn", "deleteMany") },
    recommendation: del("recommendation"),
    userProduct: del("userProduct"),
    bountyCompletion: del("bountyCompletion"),
    faceScan: { findMany: op("faceScan", "findMany", (data.scans ?? []).map((imageUrl) => ({ imageUrl }))), deleteMany: op("faceScan", "deleteMany") },
    skinProfile: del("skinProfile"),
    user: { delete: op("user", "delete") },
  };
  return { tx, log, calls };
}

describe("deleteAccountData", () => {
  test("deletes the user row last, after every table that points at it", async () => {
    const { tx, log } = fakeTx();
    await deleteAccountData(tx, "u1");
    assert.equal(log[log.length - 1], "user.delete");
    for (const t of ["comment", "postLike", "bookmark", "report", "post", "routine", "review", "checkIn", "recommendation", "userProduct", "bountyCompletion", "faceScan", "skinProfile"]) {
      assert.ok(log.includes(`${t}.deleteMany`), `${t} was not cleared`);
      assert.ok(log.indexOf(`${t}.deleteMany`) < log.indexOf("user.delete"), `${t} cleared after the user`);
    }
  });

  test("clears children before parents: routine steps before routines, comments before posts", async () => {
    const { tx, log } = fakeTx();
    await deleteAccountData(tx, "u1");
    assert.ok(log.indexOf("routineStep.deleteMany") < log.indexOf("routine.deleteMany"));
    assert.ok(log.indexOf("comment.deleteMany") < log.indexOf("post.deleteMany"));
  });

  test("every delete is scoped to this user", async () => {
    const { tx, calls } = fakeTx();
    await deleteAccountData(tx, "u1");
    for (const t of ["comment", "postLike", "bookmark", "report", "post", "review", "checkIn", "recommendation", "userProduct", "bountyCompletion", "faceScan", "skinProfile"]) {
      assert.deepEqual(calls[`${t}.deleteMany`]![0], { where: { userId: "u1" } }, t);
    }
    assert.deepEqual(calls["routineStep.deleteMany"]![0], { where: { routine: { userId: "u1" } } });
    assert.deepEqual(calls["user.delete"]![0], { where: { id: "u1" } });
  });

  test("detaches other people's replies from this person's comments", async () => {
    const { tx, calls } = fakeTx({ comments: ["c1", "c2"] });
    await deleteAccountData(tx, "u1");
    assert.deepEqual(calls["comment.updateMany"]![0], {
      where: { parentCommentId: { in: ["c1", "c2"] } },
      data: { parentCommentId: null },
    });
  });

  test("skips the reply update when the person has no comments", async () => {
    const { tx, log } = fakeTx();
    await deleteAccountData(tx, "u1");
    assert.ok(!log.includes("comment.updateMany"));
  });

  test("returns every uploaded file URL so storage can be cleaned up", async () => {
    const { tx } = fakeTx({
      posts: [[mine("p1.jpg"), mine("p2.jpg")]],
      checkIns: [[mine("c1.jpg")], []],
      scans: [mine("scan1.jpg")],
    });
    const files = await deleteAccountData(tx, "u1");
    assert.deepEqual(files.sort(), [mine("c1.jpg"), mine("p1.jpg"), mine("p2.jpg"), mine("scan1.jpg")]);
  });

  test("never returns a file that belongs to someone else, even if listed on this user's post", async () => {
    const { tx } = fakeTx({ posts: [[mine("ok.jpg"), `${bucket}/posts/victim/secret.jpg`]] });
    assert.deepEqual(await deleteAccountData(tx, "u1"), [mine("ok.jpg")]);
  });

  test("files are read before the rows are deleted", async () => {
    const { tx, log } = fakeTx();
    await deleteAccountData(tx, "u1");
    assert.ok(log.indexOf("post.findMany") < log.indexOf("post.deleteMany"));
    assert.ok(log.indexOf("checkIn.findMany") < log.indexOf("checkIn.deleteMany"));
    assert.ok(log.indexOf("faceScan.findMany") < log.indexOf("faceScan.deleteMany"));
  });
});

describe("ownedFiles", () => {
  test("keeps only files under this user's folder", () => {
    assert.deepEqual(ownedFiles([mine("a.jpg"), `${bucket}/posts/u2/a.jpg`], "u1"), [mine("a.jpg")]);
  });

  test("a user id that merely starts the same is not a match", () => {
    assert.deepEqual(ownedFiles([`${bucket}/posts/u10/a.jpg`, `${bucket}/posts/u1x/a.jpg`], "u1"), []);
  });

  test("refuses path tricks", () => {
    const tricks = [
      `${bucket}/posts/u1/../victim/a.jpg`,
      `${bucket}/posts/u1/%2e%2e/victim/a.jpg`,
      `${bucket}/posts/u1/..%2Fvictim/a.jpg`,
      `${bucket}/posts/u1\..\victim\a.jpg`,
      `${bucket}/posts/u1//a.jpg`,
      `${bucket}/posts/u1/`,
    ];
    assert.deepEqual(ownedFiles(tricks, "u1"), []);
  });

  test("ignores a query string, and URLs with no posts folder", () => {
    assert.deepEqual(ownedFiles([`${mine("a.jpg")}?v=2`], "u1"), [`${mine("a.jpg")}?v=2`]);
    assert.deepEqual(ownedFiles(["https://example.com/a.jpg", ""], "u1"), []);
  });
});
