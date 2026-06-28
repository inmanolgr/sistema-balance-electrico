import { Injectable } from '@nestjs/common';

export interface MappedEntry {
  sourceType: string;
  sourceTitle: string;
  sourceGroupId?: string;
  sourceColor?: string;
  sourceMagnitude?: string;
  value: number;
  percentage: number;
  datetime: Date;
}

@Injectable()
export class ReeDataMapper {
  mapResponse(response: any, _timeTrunc: string): MappedEntry[] {
    const entries: MappedEntry[] = [];

    // REE devuelve grupos en data.included (ej: "Renovable", "No renovable"...)
    // Cada grupo tiene sus fuentes individuales en attributes.content
    const groups = response?.data?.included ?? response?.included ?? [];

    for (const group of groups) {
      const groupAttrs = group.attributes ?? {};

      this.extractValues(
        entries,
        group.type,
        groupAttrs.title ?? group.type,
        group.groupId,
        groupAttrs.color,
        groupAttrs.magnitude,
        groupAttrs.values,
      );

      for (const source of groupAttrs.content ?? []) {
        const attrs = source.attributes ?? {};
        this.extractValues(
          entries,
          source.type,
          attrs.title ?? source.type,
          source.groupId,
          attrs.color,
          attrs.magnitude,
          attrs.values,
        );
      }
    }

    return entries;
  }

  private extractValues(
    entries: MappedEntry[],
    sourceType: string,
    sourceTitle: string,
    sourceGroupId: string | undefined,
    sourceColor: string | undefined,
    sourceMagnitude: string | undefined,
    values: any[] | undefined,
  ): void {
    for (const val of values ?? []) {
      if (val.value === null || val.value === undefined) continue;
      if (!val.datetime) continue;

      entries.push({
        sourceType: String(sourceType ?? ''),
        sourceTitle: String(sourceTitle ?? sourceType ?? ''),
        sourceGroupId: sourceGroupId ? String(sourceGroupId) : undefined,
        sourceColor: sourceColor ? String(sourceColor) : undefined,
        sourceMagnitude: sourceMagnitude ? String(sourceMagnitude) : undefined,
        value: Number(val.value),
        percentage: Number(val.percentage ?? 0),
        datetime: new Date(val.datetime as string),
      });
    }
  }

  formatDate(date: Date): string {
    const pad = (n: number): string => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }
}


