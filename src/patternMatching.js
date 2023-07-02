function checkForMatch(pattern, string) {
  const regex = pattern.replace(/{(.*?)}/g, '(?<$1>.*?)');
  const match = string.match(new RegExp(`^${regex}$`));

  if (!match) return { match: false };

  const params = {};
  const groupNames = Object.keys(match.groups || {});
  for (const groupName of groupNames) {
    params[groupName] = match.groups[groupName];
  }

  return {
    match: true,
    params,
  };
}


export {
  checkForMatch,
};
