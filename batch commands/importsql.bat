echo DROP DATABASE IF EXISTS db_gamefinder; > deleteDatabase.bat
echo CREATE DATABASE db_gamefinder; > createDatabase.bat
mysql -h localhost -u root < deleteDatabase.bat
mysql -h localhost -u root < createDatabase.bat
mysql -h localhost -u root db_gamefinder < ../database/db_gamefinder.sql
del deleteDatabase.bat
del createDatabase.bat