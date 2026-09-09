import {
	Controller,
	Delete,
	Get,
	Param,
	ParseBoolPipe,
	ParseEnumPipe,
	Query,
} from "@nestjs/common";
import { GraphService } from "./graph.service";
import { NodeType } from "./node-type";
import { TopologyService } from "./topology.service";

@Controller("api")
export class TopologyController {
	constructor(
		private readonly topology: TopologyService,
		private readonly graph: GraphService,
	) {}

	@Get("network-graph")
	getNetworkGraph() {
		return this.graph.build();
	}

	@Get("system/df")
	getSystemDf() {
		return this.topology.systemDf();
	}

	@Get("inspect/:type/:id")
	inspect(
		@Param("type", new ParseEnumPipe(NodeType)) type: NodeType,
		@Param("id") id: string,
	) {
		return this.topology.inspect(type, id);
	}

	@Delete("delete/:type/:id")
	async remove(
		@Param("type", new ParseEnumPipe(NodeType)) type: NodeType,
		@Param("id") id: string,
		@Query("force", new ParseBoolPipe({ optional: true })) force = false,
	) {
		await this.topology.remove(type, id, force);
		return { success: true };
	}
}
