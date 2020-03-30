#!/usr/bin/env python

import csv

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


def entries():
    with open('us-counties.csv') as f:
        reader = csv.reader(f)
        for i, line in enumerate(reader):
            if i == 0:
                continue
            yield Entry(line)


def latest():
    fips = {}
    for entry in entries():
        fips[entry.fips] = entry.cases
    print fips
    return sorted(fips.items(), key=lambda x: -x[1])


def top(k=10):
    return [x[0] for x in latest()[:k]]


def increase(entries):
    last = 0
    for entry in entries:
        if last == 0:
            rate = float('inf')
        else:
            rate = float(entry.cases)/last - 1
        yield entry, rate
        last = entry.cases


for fips in top(5):
    print
    for entry, rate in increase([entry for entry in entries()
        if entry.fips == fips]):
        print entry, '%2.f%%' % (rate*100)


Brackets = [(1, 9), (10, 99), (100, 999), (1000, 9999), (10000, 99999)]


def bracket(n):
    for i, (low, high) in enumerate(Brackets):
        if low <= n <= high:
            return i


def fips_bracket():
    for f, n in latest():
        yield f, bracket(n)


def bracket_fips():
    result = {}
    for f, b in fips_bracket():
        result.setdefault(b, []).append(f)
    return result


print bracket_fips()

print len(latest())
