## Dev bar for gnome. 

Gnome version of the DevBar originally made for mac https://github.com/boxed/DevBar.
See mac version readme for more information.

There is also a Cinnamon applet that can be found here: https://cinnamon-spices.linuxmint.com/applets/view/340

## Install

Install via https://extensions.gnome.org/extension/4091/devbar/

## What is it

The DevBar is a tool to overview your development workflow. 
What is displayed is up to you, but some examples are:
 - Pull requests waiting for review
 - Pull requests that need additional work
 - Crashes in an environment
 - Support messages that need attention

This can be achieved by assigning the url in the settings window to an endpoint which produces JSON as:

```
{
    "data": {
      "needs_work": [
        {
            "title": "PR to fix issue",
            "url": "https://github.com/linuxmint/cinnamon-spices-applets/pull/3692"
          }
      ],
      "waiting_for_review": [
        {
          "title": "PR to review",
          "url": "https://github.com/linuxmint/cinnamon-spices-applets/pull/3692"
        }
      ],
      "prod_crash": [
        {
          "title": "Fix this crash",
          "url": "https://google.com"
        }
      ]
    },
    "metadata": {
      "display": {
        "needs_work": {
          "priority": 10,
          "symbol": "๐",
          "title": "๐ Needs work"
        },
        "other_problems": {
          "priority": 10,
          "symbol": "๐",
          "title": "๐ Other problems"
        },
        "waiting_for_review": {
          "priority": 10,
          "symbol": "๐",
          "title": "๐ Waiting for review"
        },
        "devtest": {
          "priority": 10,
          "symbol": "๐งช",
          "title": "๐งช Can be tested by developers"
        },
        "ready_to_merge": {
          "priority": 10,
          "symbol": "๐",
          "title": "๐ Ready to merge"
        },
        "workflow_problem": {
          "priority": 10,
          "symbol": "๐คจ",
          "title": "๐คจ Workflow problem: should be 4EYE or ready for test"
        },
        "wip": {
          "priority": 11,
          "symbol": "๐ง",
          "title": "๐ง Work in progress"
        },
        "prod_crash": {
          "priority": 0,
          "symbol": "๐ฅ",
          "title": "๐ฅ Prod crash"
        }
      }
    }
  }
```
 One such example can be found at [here](https://raw.githubusercontent.com/ludvigbostrom/DevBarGnome/master/example.json?). 

### Setup
Configure in Tweaks -> Extensions -> DevBar (The settings button) or click the panel button and click "Preferences".
Here you can set up the backend url and refresh interval.

