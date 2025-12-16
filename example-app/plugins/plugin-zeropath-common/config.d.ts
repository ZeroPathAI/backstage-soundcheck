export interface Config {
  zeropath?: {
    /**
     * ZeroPath organization identifier
     * @visibility frontend
     */
    organizationId: string;

    /**
     * Entity annotation key used for repository matching
     * @visibility frontend
     * @default "github.com/project-slug"
     */
    repositoryAnnotation?: string;
  };
}
