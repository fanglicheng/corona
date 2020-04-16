#!/usr/bin/env python3

import csv
from copy import deepcopy
import json

ENTRIES = []

class Entry:
    def __init__(self, line):
        (self.date,
         self.county,
         self.state,
         self.fips,
         self.cases,
         self.deaths) = line
        self.cases = int(self.cases)
        self.deaths = int(self.deaths)

    def __str__(self):
        return '%s %s %s %s' % (self.date, self.county, self.state, self.cases)


def maybe_new_york(entry):
    if entry.county == 'New York City':
        for name, fips in [('Richmond', '36085'), ('Kings', '36047'), ('Queens',
            '36081'), ('Bronx', '36005'), ('New York', '36061')]:
            e = deepcopy(entry)
            e.county = name
            e.fips = fips
            if e.cases == 0:
                print(e)
            yield e
    else:
        yield entry


def entries():
    if ENTRIES:
        for e in ENTRIES:
            yield e
    else:
        with open('../us-counties.csv') as f:
            reader = csv.reader(f)
            for i, line in enumerate(reader):
                if i == 0:
                    continue
                entry = Entry(line)
                if entry.cases == 0:
                    continue
                for e in maybe_new_york(entry):
                    ENTRIES.append(e)
                    yield e


FIPS_ENTRIES = None


def fips_entries():
    global FIPS_ENTRIES
    if FIPS_ENTRIES:
        return FIPS_ENTRIES
    result = {}
    for e in entries():
        result.setdefault(e.fips, []).append(e)
    FIPS_ENTRIES = result
    return result
    

def latest():
    fips = {}
    for entry in entries():
        fips[entry.fips] = entry
    return fips


def top(k=10):
    return [x[0] for x in sorted(
        latest().items(), key=lambda x: - x[1].cases)[:k]]


def increase(entries):
    last = 0
    for entry in entries:
        if last == 0:
            rate = float('inf')
        else:
            rate = float(entry.cases)/last - 1
        yield entry, rate
        last = entry.cases


def trend():
    result = {}
    for fips, entries in fips_entries().items():
        s = ''
        for e, rate in list(increase(entries))[-10:]:
            s += '<br>%s %s %2.f%%' % (e.date, e.cases, rate*100)
        result[fips] = s
    return result


def three_day_gain(new, old):
    return (new / old) ** (1/3) - 1


def last_3_days():
    result = {}
    for fips, entries in fips_entries().items():
        if len(entries) < 4:
            continue
        if entries[-1].cases < 50:
            continue
        result[fips] = three_day_gain(entries[-1].cases, entries[-4].cases)
    return result


def smooth_daily_gain(cases):
    if len(cases) < 4:
        return [0 for _ in range(len(cases))]
    result = [0, 0, 0]
    for i in range(len(cases)):
        if i < 4:
            continue
        result.append(three_day_gain(cases[i], cases[i - 3]))
    return result


for fips in top(5):
    print()
    for entry, rate in increase([entry for entry in entries()
        if entry.fips == fips]):
        print(entry, '%2.f%%' % (rate*100))


DATES = list(reversed(sorted(set(e.date for e in entries()))))


def padded(s):
    if len(s) < len(DATES):
        return s + [0 for _ in range(len(DATES))]
    else:
        return s


def write_geojson():
    fips2entries = fips_entries()
    latest_cases = latest()
    fips_trend = trend()
    fips_last_3_days = last_3_days()
    with open('gz_2010_us_050_00_20m.json', encoding='ISO-8859-1') as fin:
        data = json.load(fin)
        for f in data['features']:
            p = f['properties']
            fips = p['GEO_ID'][-5:]
            entry = latest_cases.get(fips)
            p['cases'] = latest_cases[fips].cases if entry else 0
            cases = [e.cases for e in fips2entries.get(fips, [])]
            p['daily_cases'] = padded(list(reversed(cases)))
            t = fips_trend.get(fips)
            p['trend'] = t if t else ''
            i = fips_last_3_days.get(fips)
            p['increase'] = i*100 if i else 0
            p['daily_increase'] = padded(list(reversed([
                i*100 for i in smooth_daily_gain(cases)])))

        with open('county-cases.json', 'w') as fout:
            json.dump(data, fout)
    print('geojson written.')


for fips in top(5):
    print()
    for entry, rate in increase([entry for entry in entries()
        if entry.fips == fips]):
        print(entry, '%2.f%%' % (rate*100))


def write_dates():
    with open('dates.json', 'w') as fout:
        json.dump(DATES, fout)
    print('dates written.')


write_geojson()
write_dates()
