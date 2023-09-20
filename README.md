# job-scanner-crawler

I initially wanted to make it to be used for others but I couldn't find a way to pass the security check page.
When you use this crawler, in the beginning, you might encounter a security check that checks if you're a bot or not.
After you manually pass the check a few times, the website won't ask you anymore.

It also has some issues at the moment

* Can't check if the page is the last page: you need to check by yourself if the page reaches the last page
* Skip Some Jobs: When it fails to get a card of job information, it just skips the job card.
* Jobs Duplication: Sometimes, it has an issue that fails to load the page, in this case, it navigates to the same page and in this case, it will check the same jobs that were already checked before.

I found out that finding English positions that I wanted took me so much time and at some point, it gave my motivation away.
This is why I created this project. Currently, the code is written only for my purpose. (React English positions in Germany).

The app generates a json file that has matched jobs with the options written in the code.
Although You can see by yourself, you can also use [a viewer](https://github.com/hsk-kr/job-scanner-json-webviewer) I created.
