/** Dependency rules for application and feature code. */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-modules',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-circular-folders',
      severity: 'error',
      scope: 'folder',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
  },
};
