import { IPackageSource } from './package-sources/source';
export interface PackageContext {
    readonly packages: IPackageSource;
}
export declare function withPackages<A extends object>(block: (context: A & PackageContext) => Promise<void>): (context: A) => Promise<void>;
