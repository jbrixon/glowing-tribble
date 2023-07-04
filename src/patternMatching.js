function checkForMatch(pattern, key) {
  const regex = pattern.replace(/{(.*?)}/g, '(?<$1>.*?)');
  const match = key.match(new RegExp(`^${regex}$`));

  if (!match) return { match: false };

  const params = {};
  const groupNames = Object.keys(match.groups || {});
  for (const groupName of groupNames) {
    params[groupName] = match.groups[groupName];
  }

  return {
    match: true,
    params,
    key,
  };
}


function keyPatternIsvalid(pattern) {
  const parameterNames = pattern.match(/{(.*?)}/g);
  if (!parameterNames) return true; // No parameters found, so it's valid

  const uniqueNames = new Set(parameterNames.map((name) => name.slice(1, -1)));
  if (uniqueNames.size !== parameterNames.length) return false; // duplicate names
  if (parameterNames.some((name) => name === '{}')) return false; // unnamed parameter
  if (parameterNames.some((name) => {
    const paramName = name.slice(1, -1);
    return paramName.includes("{") || paramName.includes("}");
  })) {
    // nested parameters
    return false;
  }

  return true;
}


export {
  checkForMatch,
  keyPatternIsvalid,
};
