/*
SQLyog Community v11.52 (32 bit)
MySQL - 5.5.33 : Database - edgysketch
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`edgysketch` /*!40100 DEFAULT CHARACTER SET utf8 */;

USE `edgysketch`;

/*Table structure for table `rooms` */

DROP TABLE IF EXISTS `rooms`;

CREATE TABLE `rooms` (
  `roomID` int(11) NOT NULL AUTO_INCREMENT,
  `noOfUsers` int(11) DEFAULT '0',
  `isFull` tinyint(1) DEFAULT '0',
  `hasPassword` tinyint(1) DEFAULT '0',
  `password` text,
  `wordSet` set('Easy','Medium','Hard') DEFAULT NULL,
  `noOfRounds` int(11) DEFAULT '5',
  `creator` int(11) DEFAULT NULL COMMENT 'The user that created it',
  PRIMARY KEY (`roomID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

/*Data for the table `rooms` */

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `LoginType` set('Guest','Facebook') DEFAULT NULL,
  `Score` int(11) DEFAULT '0',
  `userID` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`userID`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

/*Data for the table `users` */

/*Table structure for table `wordbank` */

DROP TABLE IF EXISTS `wordbank`;

CREATE TABLE `wordbank` (
  `wordID` int(11) NOT NULL AUTO_INCREMENT,
  `value` text,
  `wordSet` set('Easy','Medium','Hard') DEFAULT NULL,
  PRIMARY KEY (`wordID`)
) ENGINE=MyISAM AUTO_INCREMENT=19 DEFAULT CHARSET=utf8;

/*Data for the table `wordbank` */

insert  into `wordbank`(`wordID`,`value`,`wordSet`) values (1,'cloak','Hard'),(2,'speakers','Hard'),(7,'download','Hard'),(8,'dance','Hard'),(9,'coach','Hard'),(10,'bell','Easy'),(11,'octopus','Easy'),(12,'grass','Easy'),(13,'eyes','Easy'),(14,'frog','Easy'),(15,'saw','Medium'),(16,'chimney','Medium'),(17,'toast','Medium'),(18,'onion','Medium');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
