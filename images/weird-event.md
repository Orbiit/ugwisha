On [October 18th, 2018](https://orbiit.github.io/ugwisha/?day=2018-10-18), there's an event that's just:

```json
{
  "start": {
    "dateTime": "2018-10-18T13:30:00-07:00"
  },
  "end": {
    "dateTime": "2018-10-18T14:30:00-07:00"
  }
}
```

It has no summary. This doesn't break UGWA (it just puts the summary as "undefined") but it did break Ugwisha because it looks for certain strings in the summary using the `includes` method for schedule parsing.

Make sure that your Gunn App doesn't break with an absent `summary` property!
