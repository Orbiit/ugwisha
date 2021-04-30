# 2018-10-10 `PSAT/Grade Level assemblies alternate schedule`

Brunch times aren't listed; `ALL STUDENTS ATTEND` instead of "Flextime"; example of a longer flex period that isn't necessarily double.

```html
<span>ALL STUDENTS ATTEND, 8:30-12:00 (brunch served, no lunch)</span><br><span>No afternoon classes</span><br><span>Staff Collaboration (1:00-3:45)</span>
```

# 2019-01-11 `Alternate Schedule (see below)`

Duplicate periods

```html
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

The schedule has since been updated.

```
Period D (8:25-9:50)
Brunch (9:50-10:05)

Assembly for 9th/10th graders in Spangenberg Theater, 11th graders to SELF, 12th graders to            FlexTime (10:05-10:40)

Assembly for 11th/12th graders in Spangenberg Theater, 9th/10th graders to SELF (10:50-11:25)

Period E (11:35-12:55)
Lunch (12:55-1:35)
Period G (1:35-2:55)
```

Ugwisha did not properly detect the SELF grades.

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

There's also a `SELF for 9-11th grades` event for that day. I'm not sure if it's intended or not (the time of the event does not line up with the alternate schedule), but if not, that's another thing to watch for.

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

# 2020-03-11 `CLASH OF THE TITANS (extended lunch schedule below)`

```html
Period D (8:25-9:50)
Brunch (9:50-10:05)
FlexTime (10:05-11:00)
Period E (11:10-12:30)
Clash of the Titans extended lunch (12:30-1:35)
Period G (1:35-2:55)
Staff Meeting, CAASPP training for all (3:05-3:45)
```

The schedule itself isn't very problematic. However, the event was posted to a different calendar (`a0id1212epbc9eel40c4mggfkg@group.calendar.google.com`) which UGWA and Ugwisha are not able to detect.

I'm not sure what the best solution is here. Perhaps,

- Wait for the school to move the event to the correct calendar. However, they might not notice.

- Have a special case for this one day; however, hacky solutions are not good practice.

- Fetch from both calendars. However, the second calendar is unlikely to have many alternate schedules, so it'd be a waste of fetching.

  - There could be a somewhat special case by having a query for only this schedule and adding more as needed.

  - Alternately, perhaps only the events per day could fetch from both calendars; this also helps list the other school events that aren't put in the first calendar. However, this doubles the requests. Also, I don't think this'd work well for the Node package.

Actually, it turns out that Ugwisha thought the `CAASPP` in the staff meeting period was flex.

And then the school cancelled Clash of the Titans due to the coronavirus so the schedule was reverted to a normal 4-day week day 2 schedule on the correct calendar.

# 2020-04-02 `Alternate Schedule (see below)`

```html
<p>Period D (8:25-9:50) </p><p>Brunch (9:50-10:05) </p><p>Double FlexTime (10:05-11:25) </p><p>Period E (11:35-12:55) </p><p>Lunch (12:55-1:35) </p><p>PeriodG (1:35-2:55)&nbsp; &nbsp;&nbsp;<br></p>
```

`PeriodG` also does not have a space, like the 2020-03-31 schedule.

# 2020-03-16 to ~~2020-04-10~~ the end of the year

PAUSD [announced the closure of schools](https://www.pausd.org/explore-pausd/news/all-pausd-schools-closed-march-16-through-april-10), but no events were put on their Google Calendar for UGWA to detect. UGWA wore a mask instead.

# 2020-06-02 to 2020-06-04 `LAST CLASS MEETING schedule (see below)`

The school is organizing a finals week of Zoom sessions.

## Tuesday

```
Period B (11am-12noon)
Period D (1-2pm)
Periods Zero/H (2-3pm)
```

## Wednesday

```
Period A (11am-12noon)
Period C (1-2pm)
Period G (2-3pm)
```

## Thursday

```
Period E (11am-12noon)
Period F (1-2pm)
```

`11am` and `12noon` probably broke Ugwisha. UGWA was only showing the APs, so it didn't even try parsing the new timestamps.

# 2020-12-15 to 2020-12-17 `Alternate Schedule`

Distance learning school year. "Office Hrs" was not recognized by UGWA nor Ugwisha. UGWA supports H period but did not recognize it.

```

 Tuesday, December 15 

Staff/Dept. Meetings (8:30-8:55)

Period 1 FINAL (9:00-10:15)

Lunch (11:40-12:10)

Period 3 FINAL (12:20-1:40)

Office Hrs (3:10-3:40)

Period 8 FINAL (3:45-5:00)






```

```

 Wednesday, December 16 

Collaboration/Prep (8:30-9:35)

Period 5 FINAL (9:40-10:55)

Office Hrs (11:05-11:40)

Lunch (11:40-12:15)

Period 6 FINAL (12:25-1:40)





 




```

```

 Thursday, December 17 

Staff/Dept. Meetings (8:30-8:55)

Period 2 FINAL (10:25-11:40)

Lunch (11:40-12:10)

Period 4 FINAL (1:50-3:05)

Office Hrs (3:10-3:40)






```

# 2021-04-26 `CAASPP/CAST test alternate schedule`

A typo in the schedule makes periods 6 and 7 overlap. Also, UGWA only identifies period 1 as asynchronous.

```
* APRIL 26 - asynchronous * Period 1 (10-10:30) ELA PT & (CAST Gunn)
* Period 2 (10:40-11:10) ELA PT & (CAST Gunn)
* Period 3 (11:20 - 11:50) ELA PT & (CAST Gunn)
* Period 4 (12-12:35) ELA PT & (CAST Gunn)
* Lunch (12:35-1:05)
* Period 5 (1:15-1:45) ELA CAT 45 minutes
* Period 6 (1:55- 2:55) ELA CAT 45 minutes (open up ELA PT)
* Period 7 (2:35-3:05) buffer period
 
*  * 
 



```

# 2021-06-01 to 2021-06-03 `Finals Schedule (see below)`

A fascinating new format to end off the year! This schedule uses `Per` instead of `Period`, which neither UGWA nor Ugwisha could handle properly; instead, they showed "AM PER 1" etc. Fortunately, the fix is relatively easy.

Also, on Wednesday, "Break" gets identified as "Brunch," which is especially odd on UGWA because brunch is normally internally a hidden period because it doesn't occur during the normal school year.

## Tuesday

```

  Tuesday, June 1st  

9:00-9:40 AM  Flex/Tutorial 

9:50-11:20 AM  Per 1 

11:20-11:50 AM  Lunch 

12:00-1:30 PM  Per 2 






```

## Wednesday

```

  Wednesday, June 2nd  

9:40-11:10 AM  Per 6 

11:10-11:40 AM  Lunch 

11:50-1:20 PM  Per 3 

1:20-1:50 PM  Break 

2:00-3:30 PM  Per 7 






```

## Thursday

```

  Thursday, June 3rd  

9:00-9:40 AM  Flex/Tutorial 

9:50-11:20 AM  Per 4 

11:20-11-:50 AM  Lunch 

12:00-1:30 PM  Per 5 








```
