import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useBoolean } from "ahooks";
import { useWorkspaceStore } from "@/stores/workspace";
import { useNavigate } from "@tanstack/react-router";
import type { Group } from "@/lib/workspace-types";

export function useGroupActions({
  setError,
  setCompareReturnGroup,
  setLibraryFilter,
  routeGroupId,
  view,
}: {
  setError: Dispatch<SetStateAction<string>>;
  setCompareReturnGroup: Dispatch<SetStateAction<string>>;
  setLibraryFilter: Dispatch<SetStateAction<"all" | "ungrouped">>;
  routeGroupId: string;
  view: "library" | "compare";
}) {
  const groups = useWorkspaceStore((s) => s.groups);
  const setGroups = useWorkspaceStore((s) => s.setGroups);
  const navigate = useNavigate();
  const pendingGroupId = useRef("");
  const [newGroup, setNewGroup] = useState("");
  const [creatingGroup, { set: setCreatingGroup }] = useBoolean(false);
  const removeGroup = useWorkspaceStore((s) => s.removeGroup);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  useEffect(() => {
    if (
      pendingGroupId.current &&
      groups.some((g) => g.id === pendingGroupId.current)
    ) {
      const target = pendingGroupId.current;
      pendingGroupId.current = "";
      void navigate({ to: "/groups/$groupId", params: { groupId: target } });
    }
  }, [groups, navigate]);

  function createGroup() {
    const name = newGroup.trim();
    if (!name) return;
    if (groups.some((g) => g.name === name)) {
      setError("分组名称已存在");
      return;
    }
    const id = crypto.randomUUID();
    setGroups((prev) => [...prev, { id, name }]);
    setCompareReturnGroup(id);
    if (view === "library") {
      pendingGroupId.current = id;
    }
    setNewGroup("");
    setCreatingGroup(false);
  }

  function deleteGroup(id: string) {
    removeGroup(id);
    setCompareReturnGroup((prev) => (prev === id ? "" : prev));
    if (routeGroupId === id) {
      setLibraryFilter("all");
      void navigate({ to: "/" });
    }
  }

  return {
    newGroup,
    setNewGroup,
    creatingGroup,
    setCreatingGroup,
    groupToDelete,
    setGroupToDelete,
    createGroup,
    deleteGroup,
  };
}
