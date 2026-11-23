import { Injectable, PipeTransform } from '@nestjs/common';
import { notFound } from './errors';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[a-f\d]{24}$/i.test(value)) throw notFound('Resource');
    return value;
  }
}
