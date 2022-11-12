locals {
	zip_file = "cat1.zip"
}

data "archive_file" "zip" {
	excludes = [
		".env",
		".terraform",
		".terraform.lock.hcl",
		"main.tf",
		"terraform.tfstate",
		"terraform.tfstate.backup",
		local.zip_file,
		"terraform",
		".git",
		"*/.DS_Store",
		".gitignore",
		"res",
		"terraform/cat1.zip"
	]
	source_dir = "${path.module}/.."
	type = "zip"
	output_path = "${path.module}/${local.zip_file}"
}