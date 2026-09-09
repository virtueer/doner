import { Controller } from "@nestjs/common";
import { ContainerFileService } from "./container-file.service";
import { FileController } from "./file.controller";

@Controller("api/containers/:id")
export class ContainerFileController extends FileController {
	constructor(protected readonly files: ContainerFileService) {
		super();
	}
}
