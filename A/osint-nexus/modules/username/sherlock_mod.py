"""
Sherlock Username Enumeration Module
"""
import asyncio
import json
from pathlib import Path

import httpx

from core.engine import BaseModule
from core.models import Target, TargetType, ModuleResult, Severity


class SherlockModule(BaseModule):
    name = "sherlock"
    description = "Username enumeration across 400+ social networks"
    category = "username"
    supported_types = [TargetType.USERNAME]
    requires_api_key = False
    
    # Partial site list - in production, load from sherlock's data.json
    SITES = {
        "GitHub": "https://github.com/{}",
        "Twitter": "https://twitter.com/{}",
        "Instagram": "https://instagram.com/{}",
        "Reddit": "https://reddit.com/user/{}",
        "LinkedIn": "https://linkedin.com/in/{}",
        "Facebook": "https://facebook.com/{}",
        "YouTube": "https://youtube.com/@{}",
        "TikTok": "https://tiktok.com/@{}",
        "Pinterest": "https://pinterest.com/{}",
        "Twitch": "https://twitch.tv/{}",
        "Steam": "https://steamcommunity.com/id/{}",
        "Spotify": "https://open.spotify.com/user/{}",
        "Medium": "https://medium.com/@{}",
        "DevTo": "https://dev.to/{}",
        "HackerNews": "https://news.ycombinator.com/user?id={}",
        "Keybase": "https://keybase.io/{}",
        "Telegram": "https://t.me/{}",
        "Flickr": "https://flickr.com/people/{}",
        "Vimeo": "https://vimeo.com/{}",
        "SoundCloud": "https://soundcloud.com/{}",
        "Dribbble": "https://dribbble.com/{}",
        "Behance": "https://behance.net/{}",
        "GitLab": "https://gitlab.com/{}",
        "Bitbucket": "https://bitbucket.org/{}",
        "StackOverflow": "https://stackoverflow.com/users/{}",
        "HackerRank": "https://hackerrank.com/{}",
        "LeetCode": "https://leetcode.com/{}",
        "Patreon": "https://patreon.com/{}",
        "Tumblr": "https://{}.tumblr.com",
        "WordPress": "https://{}.wordpress.com",
        "Slack": "https://{}.slack.com",
        "About.me": "https://about.me/{}",
        "Gravatar": "https://en.gravatar.com/{}",
        "Imgur": "https://imgur.com/user/{}",
        "9GAG": "https://9gag.com/u/{}",
        "ProductHunt": "https://producthunt.com/@{}",
        "Quora": "https://quora.com/profile/{}",
        "Roblox": "https://roblox.com/user.aspx?username={}",
        "Snapchat": "https://snapchat.com/add/{}",
        "Strava": "https://strava.com/athletes/{}",
        "Fiverr": "https://fiverr.com/{}",
        "Replit": "https://replit.com/@{}",
        "Codepen": "https://codepen.io/{}",
        "Mastodon": "https://mastodon.social/@{}",
        "Cash App": "https://cash.app/${}",
        "Linktree": "https://linktr.ee/{}",
        "MySpace": "https://myspace.com/{}",
    }
    
    async def run(self, target: Target) -> ModuleResult:
        result = ModuleResult(module_name=self.name, target=target.value)
        username = target.value
        
        found_sites = []
        not_found = []
        errors = []
        
        semaphore = asyncio.Semaphore(20)
        
        async def check_site(site_name, url_template):
            async with semaphore:
                url = url_template.format(username)
                try:
                    async with httpx.AsyncClient(
                        timeout=10, 
                        follow_redirects=True,
                        headers={"User-Agent": self.config.get("general", {}).get("user_agent", "")}
                    ) as client:
                        resp = await client.get(url)
                        
                        if resp.status_code == 200:
                            # Additional check - make sure it's not a generic 404 page
                            content = resp.text.lower()
                            not_found_indicators = [
                                "page not found", "user not found", "404",
                                "doesn't exist", "not found", "no user",
                                "this page is not available"
                            ]
                            
                            is_found = not any(ind in content for ind in not_found_indicators)
                            
                            if is_found:
                                found_sites.append({
                                    "site": site_name,
                                    "url": url,
                                    "status": resp.status_code,
                                })
                            else:
                                not_found.append(site_name)
                        else:
                            not_found.append(site_name)
                            
                except Exception as e:
                    errors.append({"site": site_name, "error": str(e)})
        
        # Run all checks concurrently
        tasks = [check_site(name, url) for name, url in self.SITES.items()]
        await asyncio.gather(*tasks)
        
        # Main finding
        result.add_finding(
            category="username",
            title=f"Username '{username}' found on {len(found_sites)} sites",
            description=f"Checked {len(self.SITES)} sites, found {len(found_sites)} matches",
            data={
                "username": username,
                "total_sites_checked": len(self.SITES),
                "found_count": len(found_sites),
                "found_sites": found_sites,
                "errors": len(errors),
            },
            severity=Severity.INFO,
            confidence=0.7,
            tags=["username", "social_media", "enumeration"]
        )
        
        # Individual site findings
        for site in found_sites:
            result.add_finding(
                category="username",
                title=f"✅ {site['site']}: {site['url']}",
                description=f"Username '{username}' exists on {site['site']}",
                data=site,
                severity=Severity.LOW,
                confidence=0.75,
                tags=["username", site['site'].lower()]
            )
        
        return result