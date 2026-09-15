/**
 * Member management for a single group, rendered inside the admin Groups tab.
 *
 * Beta feedback (Sep 2, shortege@mail.uc.edu, /admin/panel/groups):
 * "Add people to groups from admin portal."
 *
 * Before this, the Groups tab could only approve or reject someone who had
 * already asked to join, and every person showed as a truncated UID. An admin
 * had no way to put a known person into a group, and no way to tell who was
 * already in one.
 */

import { useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { UserPlus, X, Loader2, Search } from "lucide-react";
import type { DirectoryUser } from "../../lib/groups";

interface AdminGroupMembersPanelProps {
  groupId: string;
  groupName: string;
  memberIds: string[];
  /** Everyone in the `users` collection, loaded once by the parent. */
  directory: DirectoryUser[];
  directoryLoading?: boolean;
  onAddMember: (groupId: string, userId: string) => Promise<void>;
  onRemoveMember: (groupId: string, userId: string) => Promise<void>;
}

export function AdminGroupMembersPanel({
  groupId,
  groupName,
  memberIds,
  directory,
  directoryLoading = false,
  onAddMember,
  onRemoveMember,
}: AdminGroupMembersPanelProps) {
  const [search, setSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byUid = useMemo(() => {
    const map = new Map<string, DirectoryUser>();
    directory.forEach((u) => map.set(u.uid, u));
    return map;
  }, [directory]);

  /** People in this group, resolved to real names where we have them. */
  const members = useMemo(
    () =>
      memberIds
        .map(
          (uid) =>
            byUid.get(uid) ?? {
              uid,
              // A member whose user doc was deleted still needs to be visible
              // and removable, so fall back to the raw UID rather than hiding.
              name: `Unknown user (${uid.substring(0, 8)}…)`,
              email: "",
            }
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [memberIds, byUid]
  );

  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  /** Directory matches for the search box, excluding existing members. */
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return directory
      .filter((u) => !memberSet.has(u.uid))
      .filter(
        (u) =>
          u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [search, directory, memberSet]);

  const runAction = async (
    userId: string,
    action: (groupId: string, userId: string) => Promise<void>,
    failureMessage: string
  ) => {
    setBusyUserId(userId);
    setError(null);
    try {
      await action(groupId, userId);
      // The search term is deliberately kept: adding three people off one
      // search should not mean retyping it three times. The added person drops
      // out of `results` on the next render because they are now a member.
    } catch (err) {
      console.error(failureMessage, err);
      setError(failureMessage);
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-4">
      {/* Add a member */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">Add a member</h4>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder={
              directoryLoading ? "Loading people…" : "Search by name or email…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={directoryLoading}
            aria-label={`Add a member to ${groupName}`}
          />
        </div>

        {search.trim() && results.length === 0 && !directoryLoading && (
          <p className="text-xs text-muted-foreground">
            No one matches “{search.trim()}” who isn’t already in this group.
          </p>
        )}

        {results.length > 0 && (
          <ul className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {results.map((user) => (
              <li
                key={user.uid}
                className="flex items-center justify-between gap-3 p-2 pl-3 bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  {user.email && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={busyUserId === user.uid}
                  onClick={() =>
                    runAction(user.uid, onAddMember, "Could not add that person. Try again.")
                  }
                  className="bg-accent hover:bg-accent/90 text-accent-foreground flex-shrink-0"
                >
                  {busyUserId === user.uid ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Current members */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">
          Members{" "}
          <Badge variant="outline" className="ml-1">
            {members.length}
          </Badge>
        </h4>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {members.map((user) => (
              <li
                key={user.uid}
                className="flex items-center gap-2 pl-3 pr-1 py-1 bg-muted/50 rounded-full"
                title={user.email || user.uid}
              >
                <span className="text-sm text-foreground">{user.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${user.name} from ${groupName}`}
                  disabled={busyUserId === user.uid}
                  onClick={() =>
                    runAction(
                      user.uid,
                      onRemoveMember,
                      "Could not remove that person. Try again."
                    )
                  }
                  className="flex items-center justify-center w-6 h-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                >
                  {busyUserId === user.uid ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
