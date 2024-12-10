// Source: https://github.com/tmpfs/format-util/blob/0c989942c959b179eec294a4e725afd63e743f18/format.js
// Copied here to avoid the need for commonjs polyfills

export const utilFormat = (fmt: string, ...args: any[]): string => {
  const re = /(%?)(%([ojds]))/g;
  let ret = fmt;
  if (args.length) {
    ret = ret.replace(re, (match, escaped, ptn, flag) => {
      let arg = args.shift();
      switch (flag) {
        case 'o':
          if (Array.isArray(arg)) {
            arg = JSON.stringify(arg);
          }
          break;
        case 's':
          arg = '' + arg;
          break;
        case 'd':
          arg = Number(arg);
          break;
        case 'j':
          arg = JSON.stringify(arg);
          break;
      }
      if (!escaped) {
        return arg;
      }
      args.unshift(arg);
      return match;
    });
  }

  // arguments remain after formatting
  if (args.length) {
    ret += ' ' + args.join(' ');
  }

  // update escaped %% values
  ret = ret.replace(/%{2,2}/g, '%');

  return '' + ret;
};
