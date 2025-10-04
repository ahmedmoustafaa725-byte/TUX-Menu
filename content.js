(() => {
  const globalObj = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {};
  const existingContent =
    globalObj && typeof globalObj.__TUX_CONTENT__ === "object" && globalObj.__TUX_CONTENT__ !== null
      ? globalObj.__TUX_CONTENT__
      : {};

  const defaultCheckout = {
    order: "order.html",
    account: "account.html",
    profile: "profile.html",
    register: "register.html",
  };

  const checkoutUrls = {
    ...defaultCheckout,
    ...(existingContent.checkoutUrls || {}),
  };

  const nextContent = {
    ...existingContent,
    checkoutUrls,
  };

  if (globalObj) {
    globalObj.__TUX_CONTENT__ = nextContent;
    if (typeof globalObj.__tuxContent !== "object" || globalObj.__tuxContent === null) {
      globalObj.__tuxContent = nextContent;
    } else {
      globalObj.__tuxContent.checkoutUrls = checkoutUrls;
    }
    if (!globalObj.__tuxCheckoutUrls) {
      globalObj.__tuxCheckoutUrls = checkoutUrls;
    }
  }
})();
