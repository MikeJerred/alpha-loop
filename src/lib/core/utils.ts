export const throttle = <T>(func: (value: T) => void, ms = 500) => {
  let timeout: NodeJS.Timeout | number | undefined = undefined;

  return (value: T) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(value), ms);
  }
};
