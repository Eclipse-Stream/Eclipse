@echo off

set RULE_NAME=Eclipse Sunshine

rem Delete the rule
netsh advfirewall firewall delete rule name=%RULE_NAME%
