
import { Observable, Subject, from, AsyncSubject, BehaviorSubject } from "rxjs";
import { mergeMap, map, zip } from "rxjs/operators";
import { Swagger } from "./swagger";
import fetch from "node-fetch";
export class Downloader {

    private subject = new BehaviorSubject<string>('');

    /**
     * 观察api数据
     */
    api$: Observable<Swagger>;

    constructor() {
        this.api$ = this.subject.asObservable().pipe(
            mergeMap(uri => {
                return from(fetch(uri));
            }),
            mergeMap(resp => {
                return from(resp.json());
            }),
            map(body => {
                return body;
            })
        );
    }

    donwload(uri: string) {
        this.subject.next(uri);
    }

}