import { Observable, of, zip, combineLatest, Subject, from, concat } from "rxjs";
import { Swagger } from "./swagger";
import { map, mergeMap, zipAll, filter, tap } from "rxjs/operators";
import { SwaggerDefinition } from "./swagger-definition";
import { SwaggerProperty } from "./swagger-property";
import { isNullOrUndefined, isString } from "util";
import { writeFile, writeFileSync, existsSync, mkdirSync } from "fs";

export class Generator {
    private subject = new Subject<[Observable<Swagger>, string]>();

    apiFile$: Observable<string[]>;


    generateClassFileName(typeName: string) {
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

    appendImport(imports: Array<string>, typeName: string): void {
        if (typeName) {
            const result = /^([\w]*)(<([\S]*)>)?/ig.exec(typeName);
            if (result !== null) {
                const [input, type, genericString, genericType] = result;
                const importString = `import { ${type} } from './api-${this.generateClassFileName(type)}';`;
                if (!imports.includes(importString)) {
                    imports.push(importString);
                }
                this.appendImport(imports, genericType);
            }
        }
    }

    generateRefType(ref: string): string {
        const execArray = /#\/definitions\/([^\/]*)$/.exec(ref);
        let type = 'Api';
        if (execArray === null) {
            throw new Error(`Ref type "${ref}" invalid!`)
        }
        const [, typeName] = execArray;
        type += typeName.replace(/«/g, '<Api').replace(/»/g, '>');
        return type;
    }

    generateType(
        name: string,
        property: SwaggerProperty | null = null,
        imports: Array<string> | null = null): string {
        if (['integer', 'double', 'float', 'number'].includes(name)) {
            return 'number';
        } else if (['array', 'List'].includes(name) && property !== null) {
            if (property.$ref) {
                const itemsTypeName = this.generateRefType(property.$ref);
                if (imports) {
                    this.appendImport(imports, itemsTypeName);
                }
                return `Array<${itemsTypeName}>`;
            } else {
                return `Array<${this.generateType(property.type, null, null)}>`;
            }
        } else if (isNullOrUndefined(name) && property && property.$ref) {
            const itemsTypeName = this.generateRefType(property.$ref);
            if (imports) {
                this.appendImport(imports, itemsTypeName);
            }
            return `${itemsTypeName}`;
        } else if (isString(name)) {
            name = name.replace(/«/g, '<').replace(/»/g, '>');
            const result = /^([\w]*)(<([\S]*)>)?/ig.exec(name);
            if (result !== null) {
                const [input, type, genericString, genericType] = result;
                if (imports !== null) {
                    this.appendImport(imports, genericType);
                }
            }
            return name;
        } else {
            return 'any';
        }
    }

    generateProperties(
        required: Array<string>,
        properties: { [key: string]: SwaggerProperty },
        imports: Array<string>): Array<string> {

        const propertyStringList = new Array<string>();

        if (isNullOrUndefined(properties)) {
            return propertyStringList;
        }

        Object.keys(properties).forEach((key) => {
            const property = properties[key];
            propertyStringList.push(
                `  /**`,
                `   * ${property.description} `,
                `   */`,
                `  ${key}${required && required.includes(key) ? '' : '?'}: ${this.generateType(property.type, property, imports)}${property.allowEmptyValue ? ' | null' : ''};`
            );
        });
        return propertyStringList;

    }

    generateInterface(definition: SwaggerDefinition, api: Swagger): string {
        const typeName = 'Api' + this.generateType(definition.title, null, null);
        const imports = new Array<string>();
        const content = new Array<string>();
        content.push(
            `/**`,
            ` * ${definition.description}`,
            ` */`,
            `export interface ${typeName} {`,
            ...this.generateProperties(definition.required, definition.properties, imports),
            `}`,
            ``
        );
        return [
            ...imports.filter((item: string) => {
                return item !== `import { ${typeName} } from './${this.generateClassFileName(typeName)}';`;
            }),
            ...content
        ].join('\r\n');
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
                            .filter(key => !['Map'].includes(key))
                            .forEach((key) => {
                                definitions.push(api.definitions[key]);
                            });
                        return from(definitions).pipe(
                            map((definition) => {
                                const content = this.generateInterface(definition, api);
                                return [content, `${output}/api-${this.generateClassFileName(this.generateType(definition.title))}.ts`]
                            })
                        );
                    }),
                    tap(([content, outputPath]) => {
                        if (!existsSync(output)) {
                            mkdirSync(output);
                        }
                        console.log(outputPath, content)
                        writeFileSync(outputPath, content);
                    })
                )
            })
        );
    }

    generate(api$: Observable<Swagger>, oupput: string) {
        this.subject.next([api$, oupput]);
    }

}