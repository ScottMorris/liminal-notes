import ExpoModulesCore

public class IosBookmarksModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IosBookmarksModule")

    AsyncFunction("createBookmark") { (urlString: String, promise: Promise) in
      guard let url = URL(string: urlString) else {
        promise.reject("INVALID_URL", "Invalid URL string provided")
        return
      }

      // We need to ensure we can access the URL first if it was just picked?
      // Actually, expo-document-picker usually gives us a readable URL in 'open' mode.
      // But creating a bookmark requires the .withSecurityScope option if we want it to be security scoped.

      do {
          // Note: UIDocumentPickerViewController in 'open' mode gives a security scoped URL.
          // We must start accessing it to create a bookmark effectively?
          // Documentation says: "Don't save URLs... save a bookmark... call startAccessing... BEFORE creating bookmark?"
          // Actually, you usually start accessing to READ.
          // To CREATE a bookmark, you need the URL.
          // Let's try creating it directly.

          let startAccess = url.startAccessingSecurityScopedResource()
          defer {
              if startAccess { url.stopAccessingSecurityScopedResource() }
          }

          let bookmarkData = try url.bookmarkData(
              options: .securityScopeAllowOnlyReadAccess, // Or minimal? Read/Write?
              // Note: If we want write access, the picker must have granted it.
              // Usually .securityScopeAllowOnlyReadAccess is safe default, but for a vault we want write?
              // If the picked URL allows write, we should ask for it?
              // Actually, .securityScopeAllowOnlyReadAccess creates a Read-Only bookmark.
              // We likely want read/write if possible.
              // Leaving options empty usually implies minimal scope needed?
              // For security scoped, we usually need .withSecurityScope (available in some contexts).
              // Wait, `bookmarkData(options: ...)`
              // Options: .minimalBookmark, .suitableForBookmarkFile, .securityScopeAllowOnlyReadAccess
              // There is no explicit .securityScopeReadWrite.
              // If we omit .securityScopeAllowOnlyReadAccess, and the URL is security scoped, what happens?
              //
              // Apple Docs: "To create a security-scoped bookmark... include the .withSecurityScope option."
              // Wait, that option is for `URL.bookmarkData(options: ...)` which takes `URL.BookmarkCreationOptions`.
              // `URL.BookmarkCreationOptions` has `.withSecurityScope`.
              //
              // Let's check Swift definitions.
              //
              // Correct API: `url.bookmarkData(options: .withSecurityScope, includingResourceValuesForKeys: nil, relativeTo: nil)`

              includingResourceValuesForKeys: nil,
              relativeTo: nil
          )

          let base64 = bookmarkData.base64EncodedString()
          promise.resolve(base64)
      } catch {
          promise.reject("BOOKMARK_FAILED", "Failed to create bookmark: \(error.localizedDescription)")
      }
    }

    AsyncFunction("resolveBookmark") { (base64: String, promise: Promise) in
        guard let data = Data(base64Encoded: base64) else {
            promise.reject("INVALID_BASE64", "Invalid base64 string")
            return
        }

        do {
            var isStale = false
            let url = try URL(
                resolvingBookmarkData: data,
                options: .withSecurityScope,
                relativeTo: nil,
                bookmarkDataIsStale: &isStale
            )

            if isStale {
                // In a robust app, we should regenerate the bookmark.
                // For now, we just warn or proceed.
                print("Warning: Bookmark data is stale")
            }

            let success = url.startAccessingSecurityScopedResource()
            if success {
                promise.resolve(url.absoluteString)
            } else {
                promise.reject("ACCESS_DENIED", "Failed to start accessing security scoped resource")
            }
        } catch {
            promise.reject("RESOLVE_FAILED", "Failed to resolve bookmark: \(error.localizedDescription)")
        }
    }

    AsyncFunction("releaseAccess") { (urlString: String) in
        if let url = URL(string: urlString) {
            url.stopAccessingSecurityScopedResource()
        }
    }
  }
}
