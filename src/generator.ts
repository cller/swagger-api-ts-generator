import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { combineLatest, from, Observable, Subject, of } from 'rxjs';
import { filter, map, mergeMap, tap, catchError } from 'rxjs/operators';
import { isNullOrUndefined, isString } from 'util';
import { Swagger } from './swagger';
import { SwaggerDefinition } from './swagger-definition';
import { SwaggerProperty } from './swagger-property';

export class Generator {

    public apiFile$: Observable<string[]>;
    private subject = new Subject<[Observable<Swagger>, string]>();

    public generateInterfaceFileName(typeName: string) {
        let fileName = ``;

        typeName.split('').forEach((char, index) => {
            if (/[A-Z]/.test(char)) {
                fileName += `${index > 0 ? '-' : ''}${char.toLowerCase()}`;
            } else {
                fileName += char;
            }
        });

        return fileName;
    }

    public generateTypeName(rawName: string) {
        return ('Api' + rawName)
            .replace(/«/g, '<')
            .replace(/»/g, '>')
            .replace(/</g, '<Api')
            .replace(/,/g, ',Api')
            .replace(/^Api(?=((string|number|Map|object|Array)[,>]?))/g, '')
            .replace(/<Api(?=((string|number|Map|object|Array)[,>]?))/g, '<')
            .replace(/,Api(?=((string|number|Map|object|Array)[,>]?))/g, ',');
    }

    public generateInterfaceName(typeName: string, genericTypes: string[]) {
        const result = /^([\w]*)(<([\S]*)>)?/ig.exec(this.generateTypeName(typeName));
        if (result === null) {
            throw new Error(`invalid class ${typeName}`);
        }
        const [, type, , genericTypeString] = result;

        if (genericTypeString) {
            genericTypes.push(
                genericTypeString
            );
        }

        return type;
    }

    public appendImport(imports: string[], typeName: string): void {
        if (typeName) {
            const result = /^([\w]*)(<([\S]*)>)?/ig.exec(typeName);
            if (result !== null) {
                const [, type, , genericType] = result;
                const importString = `import { ${type} } from './${this.generateInterfaceFileName(type)}';`;
                if (!imports.includes(importString) && !['string', 'number', 'Map', 'Array', 'object'].includes(type)) {
                    imports.push(importString);
                }
                this.appendImport(imports, genericType);
            }
        }
    }

    public generateRefType(ref: string): string {
        const execArray = /#\/definitions\/([^\/]*)$/.exec(ref);
        if (execArray === null) {
            throw new Error(`Ref type '${ref}' invalid!`);
        }
        const [, rawName] = execArray;
        return this.generateTypeName(rawName);
    }

    private generateType(
        name: string,
        property: SwaggerProperty | null = null,
        imports: string[] | null = null,
        genericTypes: string[] | null = null): string {
        if (['integer', 'double', 'float', 'number'].includes(name)) {
            return 'number';
        } else if (['string', 'boolean'].includes(name)) {
            return name;
        } else if (['object'].includes(name)) {
            return 'any';
        } else if (['Map'].includes(name)) {
            return '{[key: string]: any}';
        } else if (['array', 'List'].includes(name) && property && property.items) {
            if (property.items.$ref) {
                let itemsTypeName = this.generateRefType(property.items.$ref);
                if (genericTypes && genericTypes.includes(itemsTypeName)) {
                    itemsTypeName = `T${genericTypes.indexOf(itemsTypeName)}`;
                } else if (imports) {
                    this.appendImport(imports, itemsTypeName);
                }
                return `Array<${itemsTypeName}>`;
            } else {
                return `Array<${this.generateType(property.items.type, property, null)}>`;
            }
        } else if (isNullOrUndefined(name) && property && property.$ref) {
            let itemsTypeName = this.generateRefType(property.$ref);
            if (imports) {
                if (genericTypes && genericTypes.includes(itemsTypeName)) {
                    itemsTypeName = `T${genericTypes.indexOf(itemsTypeName)}`;
                } else {
                    this.appendImport(imports, itemsTypeName);
                }
            }
            return `${itemsTypeName}`;
        } else if (isString(name)) {
            name = this.generateTypeName(name);
            const result = /^([\w]*)(<([\S]*)>)?/ig.exec(name);
            if (result === null) {
                return name;
            }
            const [, type, , genericType] = result;
            if (imports !== null) {
                this.appendImport(imports, genericType);
            }
            return type;
        } else {
            return 'any';
        }
    }

    public generateProperties(
        required: string[],
        properties: { [key: string]: SwaggerProperty },
        imports: string[],
        genericTypes: string[]): string[] {

        const propertyStringList = new Array<string>();

        if (isNullOrUndefined(properties)) {
            propertyStringList.push('  [key: string]: any;');
            return propertyStringList;
        }

        Object.keys(properties).forEach((key) => {
            const property = properties[key];
            const requiredString = `${required && required.includes(key) ? '' : '?'}`;
            const typeString = `${this.generateType(property.type, property, imports, genericTypes)}`;
            const allowEmpty = `${property.allowEmptyValue ? ' | null' : ''}`;
            propertyStringList.push(
                `  /**`,
                `   * ${property.description}`,
                `   */`,
                `  ${key}${requiredString}: ${typeString}${allowEmpty};`,
            );
        });

        return propertyStringList;
    }

    public generateInterface(definition: SwaggerDefinition): string {
        const imports = new Array<string>();
        const content = new Array<string>();
        const genericTypes = new Array<string>();
        const typeName = this.generateInterfaceName(definition.title, genericTypes);
        let generic = genericTypes.reduce<string>((result, value, index, arr) => {
            if (index === 0) {
                result += '<';
            }

            result += `T${index}`;

            if (index + 1 === arr.length) {
                result += `>`
            } else {
                result += `,`
            }

            return result;
        }, '');

        content.push(
            `/**`,
            ` * ${definition.description}`,
            ` */`,
            `export interface ${typeName}${generic} {`,
            ...this.generateProperties(definition.required, definition.properties, imports, genericTypes),
            `}`,
            ``,
        );
        return [
            ...imports.filter((item: string) => {
                return item !== `import { ${typeName} } from './${this.generateInterfaceFileName(typeName)}';`;
            }),
            ...content,
        ].join('\r\n');
    }

    public generate(api$: Observable<Swagger>, oupput: string) {
        this.subject.next([api$, oupput]);
    }



    constructor() {
        this.apiFile$ = this.subject.asObservable().pipe(
            mergeMap(([api$, output]) => {
                return combineLatest(api$).pipe(
                    map(([api]) => {
                        return api;
                    }),
                    mergeMap((api) => {
                        const definitions = new Array<SwaggerDefinition>();
                        Object.keys(api.definitions)
                            .filter((key) => !/^(Map|List)«[\s\S]*»$/g.test(key))
                            // .filter(key => key === 'HttpResponse«Page«Version»»')
                            .forEach((key) => {
                                console.log(key);
                                definitions.push(api.definitions[key]);
                            });
                        return from(definitions).pipe(
                            // filter(definition => definition.title === 'HomeDeviceTrendRes'),
                            map((definition) => {
                                console.log(`genearate ${definition.title} ...`)
                                const content = this.generateInterface(definition);
                                const filename = this.generateInterfaceFileName(this.generateType(definition.title));
                                return [
                                    content,
                                    `${output}/${filename}.ts`,
                                ];
                            }),
                        );
                    }),
                    tap(([content, outputPath]) => {
                        if (!existsSync(output)) {
                            mkdirSync(output);
                        }
                        console.log(`write ${outputPath} ...`)
                        writeFileSync(outputPath, content);
                        console.log(`${content}`);
                        console.log(`=====================================ok=====================================`);
                    })
                );
            }),
            catchError((error) => {
                return of([]);
            })
        );
    }

}