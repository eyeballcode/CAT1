resource "aws_lambda_function" "cat" {
  filename      = "cat.zip"
  function_name = "cat"
  role          = aws_iam_role.iam_for_lambda.arn
  handler       = "../index.cat"

  source_code_hash = filebase64sha256("cat.zip")

  runtime = "nodejs16.x"
}
