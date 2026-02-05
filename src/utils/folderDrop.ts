export async function getFilesFromDataTransfer(
  dataTransfer: DataTransfer
): Promise<
  | {
      kind: "files";
      files: File[];
    }
  | {
      kind: "folder";
      folderName: string;
      fileHandles: FileSystemFileHandle[];
      files: File[];
    }
  | null
> {
  const items = Array.from(dataTransfer.items);
  if (items.length === 0) {
    const files = Array.from(dataTransfer.files);
    if (files.length === 0) return null;
    return { kind: "files", files };
  }

  const fileHandles: FileSystemFileHandle[] = [];
  const files: File[] = [];
  let folderName: string | null = null;

  for (const item of items) {
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const handle = await (item as DataTransferItem & { getAsFileSystemHandle?(): Promise<FileSystemHandle | undefined> }).getAsFileSystemHandle?.();
        if (handle && "kind" in handle && handle.kind === "directory") {
          if (!folderName) {
            folderName = handle.name;
          }
          fileHandles.push(handle as FileSystemFileHandle);
        }
      } else {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
  }

  if (fileHandles.length > 0) {
    return {
      kind: "folder",
      folderName: folderName || "Folder",
      fileHandles,
      files,
    };
  }

  if (files.length > 0) {
    return { kind: "files", files };
  }

  return null;
}
