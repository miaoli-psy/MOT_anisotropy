<?php
header('Access-Control-Allow-Origin: *');

class UserDir extends SplFileInfo
{
    public function createImageDirectory($name)
    {
        return $this->createSubdirectory($name);
    }
    private function createSubdirectory($name)
    {
        return mkdir($dir);
    }
}

$id = $_GET["id"];
$gender = $_GET["gender"];
$age = $_GET["age"];
$data = $_GET["data"];
$test = $_GET["test"];

$date = date('d/m/Y h:i:s a', time());

$userDir = new UserDir("");
$userDir->createImageDirectory($test);

$myFile = "$test/$id-$gender-$age.txt";

$fh = fopen($myFile, 'a') or die("can't open file");
$stringData = "$date\t$data\r\n";
fwrite($fh,$stringData);
fclose($fh);



echo "succes";
?>