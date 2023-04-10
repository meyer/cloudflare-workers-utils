/** Parses request headers into something nicer */
export const parseHeaders = (request: Request) => {
  const acceptHeader = request.headers.get('Accept');
  return {
    accept:
      acceptHeader?.split(',').map((item) => {
        const str = item.trim();
        // remove ;q=xyz
        const semicolonIndex = str.indexOf(';');
        if (semicolonIndex === -1) return str;
        return str.slice(0, semicolonIndex);
      }) || [],
  };
};
