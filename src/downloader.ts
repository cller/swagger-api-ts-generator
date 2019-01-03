
import fetch from 'node-fetch';
import { from, Observable, Subject, empty } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { Swagger } from './swagger';
export class Downloader {

  /**
   * 观察api数据
   */
  public api$: Observable<Swagger>;

  private subject = new Subject<string>();

  constructor() {
    this.api$ = this.subject.asObservable().pipe(
      mergeMap((uri) => {
        return from(fetch(uri));
      }),
      mergeMap((resp) => {
        return from(resp.json());
      }),
      map((body) => {
        return body;
      }),
      catchError((error) => {
        console.log(error);
        return empty();
      })
    );
  }

  public donwload(uri: string) {
    this.subject.next(uri);
  }

}
