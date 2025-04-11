/**
 * Use named imports to improve tree-shaking capabilities.
 */
import {
  array,
  number,
  object,
  string,
  enum as enum_,
  type z,
  boolean,
  record,
  union,
} from 'zod';

export const ConfigureParams = object({
  /**
   * The (relative or absolute) path to mutation testing framework's config file to load.
   */
  configFilePath: string().optional(),
});
export type ConfigureParams = z.infer<typeof ConfigureParams>;

export const ConfigureResult = object({
  /**
   * The mutation testing server protocol major version that the server supports.
   * For example, "1"
   */
  version: string(),
});

export type ConfigureResult = z.infer<typeof ConfigureResult>;

export const DiscoverParams = object({
  /**
   * The files to run discovery on, or omitted to discover all files in the current project.
   * A file ending with a `/` indicates a directory. Each path can specify exactly which code blocks to mutate/discover using a mutation range.
   * This can be done by postfixing your file with `:startLine[:startColumn]-endLine[:endColumn]`.
   */
  files: array(string()).optional(),
});

export type DiscoverParams = z.infer<typeof DiscoverParams>;

export const Position = object({
  line: number(),
  column: number(),
});

export type Position = z.infer<typeof Position>;

export const Location = object({
  start: Position,
  end: Position,
});

export type Location = z.infer<typeof Location>;

export const DiscoveredMutant = object({
  id: string(),
  location: Location,
  description: string().optional(),
  mutatorName: string(),
  replacement: string().optional(),
});

export type DiscoveredMutant = z.infer<typeof DiscoveredMutant>;

export const DiscoveredFile = object({ mutants: array(DiscoveredMutant) });

export type DiscoveredFile = z.infer<typeof DiscoveredFile>;

export const DiscoveredFiles = record(string(), DiscoveredFile);

export type DiscoveredFiles = z.infer<typeof DiscoveredFiles>;

export const DiscoverResult = object({
  files: DiscoveredFiles,
});

export type DiscoverResult = z.infer<typeof DiscoverResult>;

export const FileTarget = object({
  type: string().refine((val) => val === 'file', {
    message: "Type must be 'file'",
  }),
  /**
   * The file path to test. A path ending with `/` indicates a directory.
   * Mutation ranges can be specified with the format `:startLine[:startColumn]-endLine[:endColumn]`.
   * Example: "src/app.js:1-11" or "src/utils/:5:4-6:4"
   */
  file: string(),
});

export type FileTarget = z.infer<typeof FileTarget>;

export const MutantTarget = DiscoveredMutant.extend({
  type: string().refine((val) => val === 'mutant', {
    message: "Type must be 'mutant'",
  }),
  /**
   * The file in which the mutant is located.
   */
  file: string(),
});

export type MutantTarget = z.infer<typeof MutantTarget>;

export const MutationTestTarget = union([FileTarget, MutantTarget]);

export type MutationTestTarget = z.infer<typeof MutationTestTarget>;

export const MutationTestParams = object({
  /**
   * The specific targets to run mutation testing on, or undefined to run mutation testing on all files in the current project.
   *
   * Targets can either be:
   * - File targets: referring to files or directories, optionally with mutation ranges.
   * - Mutant targets: referring to specific discovered mutants.
   */
  targets: array(MutationTestTarget).optional(),
});

export type MutationTestParams = z.infer<typeof MutationTestParams>;

export const MutantStatus = enum_([
  'Killed',
  'Survived',
  'NoCoverage',
  'CompileError',
  'RuntimeError',
  'Timeout',
  'Ignored',
  'Pending',
]);

export type MutantStatus = z.infer<typeof MutantStatus>;

export const MutantResult = DiscoveredMutant.extend({
  /**
   * The test ids that covered this mutant. If a mutation testing framework doesn't measure this information, it can simply be left out.
   */
  coveredBy: array(string()).optional(),
  /**
   * The net time it took to test this mutant in milliseconds. This is the time measurement without overhead from the mutation testing framework.
   */
  duration: number().optional(),
  /**
   * The test ids that killed this mutant. It is a best practice to "bail" on first failing test, in which case you can fill this array with that one test.
   */
  killedBy: array(string()).optional(),
  /**
   * A static mutant means that it was loaded once at during initialization, this makes it slow or even impossible to test, depending on the mutation testing framework.
   */
  static: boolean().optional(),
  /**
   * The status of the mutant.
   */
  status: MutantStatus,
  /**
   * The reason that this mutant has this status as free-format text. In the case of a killed mutant, this should be filled with the failure message(s) of the failing tests. In case of an error mutant, this should be filled with the error message.
   */
  statusReason: string().optional(),
  /**
   * The number of tests actually completed in order to test this mutant. Can differ from "coveredBy" because of bailing a mutant test run after first failing test.
   */
  testsCompleted: number().optional(),
});

export type MutantResult = z.infer<typeof MutantResult>;

export const MutantResultFile = object({ mutants: array(MutantResult) });

export type MutantResultFile = z.infer<typeof MutantResultFile>;

export const MutationResultFiles = record(string(), MutantResultFile);

export type MutationResultFiles = z.infer<typeof MutationResultFiles>;

export const MutationTestResult = object({
  files: MutationResultFiles,
});

export type MutationTestResult = z.infer<typeof MutationTestResult>;
