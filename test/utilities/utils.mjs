// eslint-disable-next-line import/prefer-default-export
export const marshall = (obj) => {
  const parsed = JSON.parse(JSON.stringify(obj));
  if (parsed.wikiaUrl) delete parsed.wikiaUrl;
  if (parsed.wikiaThumbnail) delete parsed.wikiaThumbnail;
  return parsed;
};
