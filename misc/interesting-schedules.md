# 2018-10-10 `PSAT/Grade Level assemblies alternate schedule`

Brunch times aren't listed; `ALL STUDENTS ATTEND` instead of "Flextime"; example of a longer flex period that isn't necessarily double.

```
<span>ALL STUDENTS ATTEND, 8:30-12:00 (brunch served, no lunch)</span><br><span>No afternoon classes</span><br><span>Staff Collaboration (1:00-3:45)</span>
```

# 2019-01-11 `Alternate Schedule (see below)`

Duplicate periods

```
<span>Period D (8:25-9:50)</span><br><span>Brunch (9:50-10:05)&nbsp;</span><br><span>SELF for 9th &amp; 10th graders &nbsp;(10:05-11:25)&nbsp;</span><br><span>FlexTime for 11th &amp; 12th graders (10:05-11:25)</span><br><span>Period E (11:35-12:55)</span><br><span>Lunch (12:55-1:35)</span><br><span>Period G (1:35-2:55)</span>
```

# 2019-03-26 `CAASPP TESTING (see schedule below)`

Duplicate times, `unch`

```
Period C (8:25-9:25)
Brunch (9:25-9:45)
ELA testing for juniors (9:45-11:45)
Flextime for seniors (9:45-11:45)
SELF for freshmen (9:45-10:40)
Flextime for sophomores (9:45-10:40)
Flextime for freshmen (10:50-11:45)
SELF for sophomores (10:50-11:45)
Period D (11:55-12:50)
unch (12:50-1:30)
Period G (1:30-2:25)
Staff Collaboration (2:35-3:35)
```

# 2019-03-27 `CAASPP TESTING (see schedule below)`

These flex periods are actually each double flex (or at least each hold two mini-courses). According to Naviance, the sessions start at 8:25, 9:10, 10:15, and 11:15. Perhaps the flex times are as follows:

- 8:25 &ndash; 9:00 (35 minutes)
- 9:10 &ndash; 10:00 (50 minutes)
- 10:15 &ndash; 11:05 (50 minutes)
- 11:15 &ndash; 12:15 (60 minutes)

There doesn't seem to be a pattern, so Ugwisha will not split these flex periods.

```
Math testing for juniors (8:25-10:00)
Flextime for freshmen, sophomores & seniors (8:25-10:00)
Brunch (10:00-10:15)
Math testing for juniors (10:15-12:15)
Flextime for freshmen, sophomores & seniors (10:15-12:15)
BBQ Lunch for test-takers! (12:15-1:05)
Staff Collaboration (1:15-3:30)
```

# 2019-04-11

Last-minute schedule change not reflected on the website; brunch was moved from before SELF to after.

# 2019-09-06 `Alternate schedule (see below)`

The unexpected newline before `(10:05-10:40)` broke UGWA, who was used to Gunn putting everything in one line.

```
Period D (8:25-9:50)
Brunch (9:50-10:05)
Assembly for 9th/10th graders in Spangenberg Theater
(10:05-10:40)11th/12th graders to FlexTimeAssembly for 11th/12th graders in Spangenberg Theater (10:50-11:25)9th/10th graders to FlexTime
Period E (11:35-12:55)
Lunch (12:55-1:35)
Period G (1:35-2:55)
```

# 2019-08-20

5 minutes of flex was moved to D period to explain how flex works, apparently; this was not reflected on the website.

# Mon 2020-03-16 to Thu 2020-03-19 (CAASPP week) `ALTERNATE SCHEDULE`

UGWA had issues with the last lines not being in its own paragraph. Since UGWA only treated `<p>` as newline characters but not `</p>`, the last line was considered merged with the previous line.

## Monday

```html
<p>Period B (8:25-9:20)</p><p>Brunch (9:20-9:40)</p><p>CAST for seniors/SELF for others (9:40-11:40)</p><p>Lunch (11:40-12:20)</p><p>CAST for sophomores/Flextime for others (12:20-2:20)</p>Period A (2:35-3:25)&nbsp; &nbsp;&nbsp;
```

UGWA had taken the first time range, but since it checks for letter periods first, "Period A" was detected first in the merged last line, so flex was classified as A period.

## Tuesday

```html
<p>Period C (8:25-9:20)</p><p>Brunch (9:20-9:40)</p><p>CAASPP #1 (9:40-11:40)</p><p>Period D (11:55-12:45)</p><p>Lunch (12:45-1:25)</p><p>Period F (1:25-2:15)&nbsp;&nbsp;</p><p>WASC Focus Groups (2:25-3:25)&nbsp;&nbsp;<br></p>
```

Ugwisha was unable to parse the non-periods (CAASPP and WASC Focus Groups). Instead, brunch was extended to ten minutes before D period, resulting in a 145 minute brunch.

## Wednesday

```html
<p>Period E (8:25-9:20)</p><p>Brunch (9:20-9:40)</p><p>CAASPP #2 (9:40-11:40)</p><p>Lunch (11:40-12:20)</p><p>CAASPP #3 (12:20-2:20)</p>Period G (2:35-3:25)&nbsp; &nbsp;&nbsp;
```

Like Monday, Period G took over CAASPP 3.

Ugwisha also excluded CAASPP 2, so brunch filled up the space up to ten minutes before lunch, resulting in a 130 minute brunch followed by a passing period for lunch.

## Thursday

```html
<p>Period B (8:25-9:35)</p><p>Brunch (9:35-9:55)</p><p>CAASPP #4 (9:55-11:55)</p><p>Extended lunch &amp; BBQ(11:55-12:50)</p><p>Period A (12:50-2:00)</p>Period F (2:10-3:15)&nbsp; &nbsp;&nbsp;
```

Period F was not parsed because "Period A" was detected first.

Ugwisha also excluded CAASPP 4, which resulted in a brunch situation similar to what it did for Wednesday.

## Friday

```html
<p>Period C (8:25-9:35)</p><p>Brunch (9:35-9:50)</p><p>Period D (9:50-10:55)</p><p>Period E (11:05-12:10)</p><p>Lunch (12:10-12:50)</p>Period G (12:50-1:55)&nbsp; &nbsp;&nbsp;
```

Like Monday and Wednesday, Period G took over lunch.

# 2020-03-31 `Alternate Schedule (see below)`

`PeriodE` and `PeriodG` do not have spaces in them, which confuses both UGWA and Ugwisha.

```html
<p>Period D (8:25-9:50) </p><p>Brunch (9:50-10:05) </p><p>Elections Assembly, 9-11 grades; Flex for 12th grade&nbsp; (10:05-11:25) </p><p>PeriodE (11:35-12:55) </p><p>Lunch (12:55-1:35) </p>PeriodG (1:35-2:55)&nbsp; &nbsp;&nbsp;
```

There's also a separate special SELF event:

> SELF/Elections Assembly for 9-11th grades; Flex for 12th grade

Either this or the alternate schedule makes Ugwisha think that there is SELF for seniors.
