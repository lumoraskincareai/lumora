// Removes everything that belongs to one user. No relation to User cascades in the schema, so every
// table is cleared by hand, children before parents, and the User row goes last. Run it inside
// prisma.$transaction so a failure leaves the account fully intact.
//
// Returns the URLs of files the person uploaded (check-in photos, post images, face scans), so the
// caller can delete them from storage after the transaction commits. Only files under their own
// posts/{userId}/ folder are returned (see ownedFiles).

type Op = (args: any) => Promise<any>;

/** The slice of a Prisma transaction client this needs. Typed loosely so tests can pass a fake. */
export interface AccountTx {
  comment: { findMany: Op; updateMany: Op; deleteMany: Op };
  postLike: { deleteMany: Op };
  bookmark: { deleteMany: Op };
  report: { deleteMany: Op };
  post: { findMany: Op; deleteMany: Op };
  routineStep: { deleteMany: Op };
  routine: { deleteMany: Op };
  review: { deleteMany: Op };
  checkIn: { findMany: Op; deleteMany: Op };
  recommendation: { deleteMany: Op };
  userProduct: { deleteMany: Op };
  bountyCompletion: { deleteMany: Op };
  faceScan: { findMany: Op; deleteMany: Op };
  skinProfile: { deleteMany: Op };
  user: { delete: Op };
}

/**
 * Keeps only URLs of files this user uploaded. Uploads are stored under posts/{userId}/, but the
 * image lists on posts and check-ins are client-supplied, so someone could list another person's
 * file URL and have it removed along with their own account. Anything with `..`, a percent
 * escape or a backslash is refused outright.
 */
export function ownedFiles(urls: string[], userId: string): string[] {
  return urls.filter((url) => {
    const at = url.indexOf("/posts/");
    if (at === -1) return false;
    const rest = url.slice(at + "/posts/".length).split("?")[0]!;
    if (/%|\\|\.\./.test(rest)) return false;
    const [owner, ...path] = rest.split("/");
    return owner === userId && path.length > 0 && path.every(Boolean);
  });
}

export async function deleteAccountData(tx: AccountTx, userId: string): Promise<string[]> {
  const mine = { where: { userId } };

  // Files first, while the rows that point at them still exist.
  const [posts, checkIns, scans] = await Promise.all([
    tx.post.findMany({ where: { userId }, select: { images: true } }),
    tx.checkIn.findMany({ where: { userId }, select: { images: true } }),
    tx.faceScan.findMany({ where: { userId }, select: { imageUrl: true } }),
  ]);
  const files = ownedFiles(
    [
      ...(posts as { images: string[] }[]).flatMap((p) => p.images),
      ...(checkIns as { images: string[] }[]).flatMap((c) => c.images),
      ...(scans as { imageUrl: string }[]).map((s) => s.imageUrl),
    ].filter(Boolean),
    userId,
  );

  // Other people's replies to this person's comments stay, but lose their parent.
  const myComments = (await tx.comment.findMany({ where: { userId }, select: { id: true } })) as { id: string }[];
  if (myComments.length > 0) {
    await tx.comment.updateMany({
      where: { parentCommentId: { in: myComments.map((c) => c.id) } },
      data: { parentCommentId: null },
    });
  }
  await tx.comment.deleteMany(mine);

  // This person's likes, bookmarks and reports on other people's posts.
  await tx.postLike.deleteMany(mine);
  await tx.bookmark.deleteMany(mine);
  await tx.report.deleteMany(mine);

  // Their posts. Likes, bookmarks, reports and comments on them cascade with the post.
  await tx.post.deleteMany(mine);

  await tx.routineStep.deleteMany({ where: { routine: { userId } } });
  await tx.routine.deleteMany(mine);
  await tx.review.deleteMany(mine);
  await tx.checkIn.deleteMany(mine);
  await tx.recommendation.deleteMany(mine);
  await tx.userProduct.deleteMany(mine);
  await tx.bountyCompletion.deleteMany(mine);
  await tx.faceScan.deleteMany(mine);
  await tx.skinProfile.deleteMany(mine);

  await tx.user.delete({ where: { id: userId } });
  return files;
}
