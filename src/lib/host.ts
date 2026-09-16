// The builder runs in two hosts: a browser tab on zyv.ro, and the renderer of
// the desktop app. A few affordances only make sense in one of them — choosing
// a file out of the open project needs both a real file dialog and a project
// to choose from.
//
// Rather than have shared components sniff for Electron, the host declares what
// it can do at startup and components ask. The web app registers nothing, so
// those controls simply do not appear there.

export type FilePickRequest = {
  // save is true when the path is a destination that need not exist yet.
  save?: boolean
  title?: string
  // The current value, so the dialog can open where the user last pointed it.
  current?: string
}

export type HostCapabilities = {
  // Returns a path relative to the open project, or null if the user cancelled.
  pickProjectFile?: (request: FilePickRequest) => Promise<string | null>
}

let capabilities: HostCapabilities = {}

export function registerHost(next: HostCapabilities): void {
  capabilities = { ...capabilities, ...next }
}

export function hostCapabilities(): HostCapabilities {
  return capabilities
}
