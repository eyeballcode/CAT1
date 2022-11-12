resource "aws_lambda_function" "cat" {
  filename      = local.zip_file
  function_name = "handler"
  role          = aws_iam_role.iam_for_lambda.arn
  handler       = "test-lambda.handler"

  source_code_hash = filebase64sha256(local.zip_file)

  runtime = "nodejs16.x"
  
  environment {
    variables = {
      NODE_ENV = "production"
    }
  }
}
