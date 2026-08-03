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
        return mkdir($name);
    }
}

$user_id  = $_GET["userId"];
$test_id  = $_GET["testId"];
$trial_nr = $_GET["trial"];
$numDots  = $_GET["numDots"];
$data     = $_GET["data"];
$test     = $_GET["test"];

// We create an UserDir object to create directories.
$userDir = new UserDir("");

$dir_test_path = "$test";
$dir_user_path = "$test/$user_id";
$file_path = "$test/$user_id/$test_id-$trial_nr.csv";

// We first check if the test already has its own directory.
if( !file_exists($dir_test_path) )
{
    // The directory for the test does not exists so we make one for it.
    $userDir->createImageDirectory($dir_test_path);
}

// We then make sure that there is a directory for the user.
if( !file_exists($dir_user_path) )
{
    // The directory for the user does not exists so we make one for it.
    $userDir->createImageDirectory($dir_user_path);
}

// Finaly We want to know if the file already exists. If this is not the case, we will need
// to first give the header to the file so the .csv file has the right format.
if( !file_exists($file_path) )
{
    // We open the file (this will create the file at the same time).
    $fh = fopen($file_path, 'a') or die("can't open file");

    // We than write down the collom headers.
    $second_line = "";
    for( $iDot = 0 ; $iDot < $numDots ; $iDot++ ) {
        $second_line .= "dot";
		$second_line .= $iDot;
		$second_line .= "x,";
        $second_line .= "dot";
		$second_line .= $iDot;
		$second_line .= "y,";
    }
    $second_line .= "\r\n";
	echo $second_line;
    fwrite($fh,$second_line);
    fclose($fh);
}

// We now write down the data in the file.
$fh = fopen($file_path, 'a') or die("can't open file");
$data .= "\r\n";
fwrite($fh,$data);
fclose($fh);

echo "succes";

?>